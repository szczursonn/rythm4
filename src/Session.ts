import {
    AudioPlayer,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
    createAudioPlayer,
} from '@discordjs/voice';
import logger from './logger';
import { initializeVoiceConnection } from './initializeVoiceConnection';
import { Snowflake, VoiceChannel } from 'discord.js';
import { Track } from './Track';

//const INACTIVITY_TIMEOUT_MS = 300_000; // 5min
const INACTIVITY_TIMEOUT_MS = 10_000; // 10s

export class SessionInitializationError extends Error {
    constructor(
        public readonly type:
            | 'missing_permissions_connect'
            | 'missing_permissions_speak'
    ) {
        super();
    }
}
export default class Session {
    public readonly guildId: Snowflake;
    private readonly voiceConnection: VoiceConnection;
    private readonly audioPlayer: AudioPlayer;
    public looping: boolean = false;
    private isProcessingQueue: boolean = false;
    private _queue: Track[] = [];
    private _currentTrack: Track | null = null;
    private inactivityTimeout: NodeJS.Timeout | null = null;

    public constructor(
        voiceChannel: VoiceChannel,
        private readonly onDestroy: () => void
    ) {
        const botPermissions = voiceChannel.permissionsFor(
            voiceChannel.guild.members.me!
        );
        if (!botPermissions.has('Connect')) {
            logger.debug(
                `Session start failed: missing connect permission (${voiceChannel.name}@${voiceChannel.guild.name})`
            );
            throw new SessionInitializationError('missing_permissions_connect');
        }

        if (!botPermissions.has('Speak')) {
            logger.debug(
                `Session start failed: missing speak permission (${voiceChannel.name}@${voiceChannel.guild.name})`
            );
            throw new SessionInitializationError('missing_permissions_speak');
        }

        this.voiceConnection = initializeVoiceConnection(
            voiceChannel,
            this.destroy.bind(this)
        );
        this.guildId = voiceChannel.guildId;

        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Play,
            },
        });
        this.voiceConnection.subscribe(this.audioPlayer);

        this.audioPlayer.on('stateChange', (oldState, newState) => {
            logger.debug(
                `AudioPlayerStateChange ${oldState.status} -> ${newState.status} on ${this.guildId} (${voiceChannel.guild.name})`
            );
            if (
                newState.status === AudioPlayerStatus.Idle &&
                oldState.status !== AudioPlayerStatus.Idle
            ) {
                this.processQueue();
            }
        });

        this.audioPlayer.on('error', (err) => {
            logger.error(
                `AudioPlayer error on ${this.guildId} (${voiceChannel.guild.name})`,
                err
            );
        });

        this.processQueue();

        logger.info(
            `Session created (${voiceChannel.name}@${voiceChannel.guild.name})`
        );
    }

    private async processQueue() {
        if (
            this.isProcessingQueue ||
            this.audioPlayer.state.status !== AudioPlayerStatus.Idle
        ) {
            return;
        }

        const nextTrack: Track | null = this.looping
            ? this._currentTrack
            : this._queue.shift() ?? null;

        if (!nextTrack) {
            this._currentTrack = null;
            this.inactivityTimeout = setTimeout(() => {
                this.destroy();
            }, INACTIVITY_TIMEOUT_MS);
            logger.debug(`Started inactivity timeout on ${this.guildId}`);
            return;
        }

        this.isProcessingQueue = true;
        logger.debug(`Processing queue on ${this.guildId}`);

        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
            logger.debug(`Stopped inactivity timeout on ${this.guildId}`);
        }

        try {
            const audioResource = await nextTrack.createAudioResource();
            this.audioPlayer.unpause();
            this.audioPlayer.play(audioResource);
            this._currentTrack = nextTrack;
            logger.debug(
                `Started playback of ${nextTrack.title} (${this.guildId})`
            );
        } catch (err) {
            logger.error(
                `Failed to create AudioResource (${nextTrack.title}, guildId: ${this.guildId}):`,
                err
            );
            this.processQueue();
        } finally {
            this.isProcessingQueue = false;
        }
    }

    public get queue(): Readonly<typeof this._queue> {
        return this._queue;
    }

    public get currentTrack(): Readonly<typeof this._currentTrack> {
        return this._currentTrack;
    }

    public clearQueue() {
        this._queue = [];
    }

    public enqueue(track: Track) {
        this._queue.push(track);
        logger.debug(`Enqueued "${track.title}" on ${this.guildId}`);
        this.processQueue();
    }

    public skipSong() {
        this.looping = false;
        this.audioPlayer.stop();
    }

    public get paused() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
    }
    public set paused(value) {
        if (value) {
            this.audioPlayer.pause(true);
        } else {
            this.audioPlayer.unpause();
        }
    }

    private isDestroyed = false;
    public destroy() {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        if (
            this.voiceConnection.state.status !==
            VoiceConnectionStatus.Destroyed
        ) {
            this.voiceConnection.destroy();
        }

        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
        }
        this._queue = [];
        this.audioPlayer.stop(true);
        this.onDestroy();

        logger.info(`Session destroyed on guild ${this.guildId}`);
    }
}
