import {
    AudioPlayer,
    AudioPlayerStatus,
    NoSubscriberBehavior,
    VoiceConnection,
    VoiceConnectionStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
} from '@discordjs/voice';
import logger from '../logger.js';
import { Snowflake, VoiceChannel } from 'discord.js';
import { MusicBot } from './MusicBot.js';
import { wait } from '../utils.js';
import ytdl from '@distube/ytdl-core';
import scdl from 'soundcloud-downloader';
import internal from 'stream';

//const INACTIVITY_TIMEOUT_MS = 300_000; // 5min
const INACTIVITY_TIMEOUT_MS = 10_000; // 10s for testing

const MAX_REJOIN_ATTEMPTS = 3;
const CHANNEL_SWITCH_DETECTION_TIMEOUT_MS = 5_000;
const REJOIN_BASE_DELAY_MS = 2_500;
const JOIN_TIMEOUT_MS = 20_000;
const CLOSE_CODE_DISCONNECTED = 4014;

export default class Session {
    public readonly bot;
    public readonly guildId;
    public looping: boolean = false;
    public currentTrack: Track | null = null;
    public queue: Track[] = [];

    private readonly voiceConnection: VoiceConnection;
    private readonly audioPlayer: AudioPlayer;

    private isProcessingQueue = false;
    private inactivityTimeout: NodeJS.Timeout | null = null;

    public constructor(bot: MusicBot, voiceChannel: VoiceChannel) {
        this.bot = bot;
        this.guildId = voiceChannel.guildId;

        this.voiceConnection = joinVoiceChannel({
            guildId: voiceChannel.guildId,
            channelId: voiceChannel.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
        });

        let isReadyFailsafeActive = false;
        // https://github.com/discordjs/voice/blob/main/examples/music-bot/src/music/subscription.ts#L32
        this.voiceConnection.on('stateChange', async (oldState, newState) => {
            logger.debug(`[${this.guildId}] voiceConnection.stateChange ${oldState.status} -> ${newState.status}`);

            switch (newState.status) {
                case VoiceConnectionStatus.Destroyed:
                    this.stopInactivityTimeout();
                    this.audioPlayer.stop(true);
                    this.bot.destroySession(this.guildId);
                    logger.info(`[${this.guildId}] Session destroyed`);
                    break;
                case VoiceConnectionStatus.Disconnected:
                    if ('closeCode' in newState && newState.closeCode === CLOSE_CODE_DISCONNECTED) {
                        // Cannot rejoin manually - wait 5s to determine if kicked or just switching channels
                        try {
                            await entersState(
                                this.voiceConnection,
                                VoiceConnectionStatus.Connecting,
                                CHANNEL_SWITCH_DETECTION_TIMEOUT_MS
                            );
                        } catch (_) {
                            this.destroy();
                        }
                    } else if (this.voiceConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS) {
                        // Can rejoin manually
                        await wait((this.voiceConnection.rejoinAttempts + 1) * REJOIN_BASE_DELAY_MS);
                        this.voiceConnection.rejoin();
                    } else {
                        this.destroy();
                    }
                    break;
                case VoiceConnectionStatus.Connecting:
                case VoiceConnectionStatus.Signalling:
                    // Prevents infinite loops of Signalling -> Connecting -> Signalling
                    if (isReadyFailsafeActive) {
                        return;
                    }

                    isReadyFailsafeActive = true;
                    try {
                        await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, JOIN_TIMEOUT_MS);
                    } catch (_) {
                        this.destroy();
                    }

                    isReadyFailsafeActive = false;
                    break;
            }
        });
        this.voiceConnection.on('error', (err) => {
            logger.error(`[${this.guildId}] voiceConnection.error`, err);
        });

        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        this.audioPlayer.on('stateChange', (oldState, newState) => {
            logger.debug(`[${this.guildId}] audioPlayer.stateChange ${oldState.status} -> ${newState.status}`);
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                this.processQueue();
            }
        });
        this.audioPlayer.on('error', (err) => {
            logger.error(`[${this.guildId}] audioPlayer.error`, err);
        });

        this.voiceConnection.subscribe(this.audioPlayer);

        logger.info(`[${this.guildId}] Session created`);

        this.startInactivityTimeout();
    }

    public get destroyed() {
        return this.voiceConnection.state.status === VoiceConnectionStatus.Destroyed;
    }

    public get paused() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
    }
    public set paused(value: boolean) {
        if (value) {
            this.audioPlayer.pause();
        } else {
            this.audioPlayer.unpause();
        }
    }

    public enqueue(...tracks: Track[]) {
        this.queue.push(...tracks);
        tracks.forEach((track) => logger.debug(`[${this.guildId}] Enqueued ${track.title}`));
        this.processQueue();
    }

    public skipCurrentTrack() {
        this.looping = false;
        this.audioPlayer.stop();
    }

    public destroy() {
        if (!this.destroyed) {
            this.voiceConnection.destroy();
        }
    }

    private async processQueue() {
        if (this.isProcessingQueue || this.audioPlayer.state.status !== AudioPlayerStatus.Idle || this.destroyed) {
            return;
        }

        const nextTrack = this.looping ? this.currentTrack : this.queue.shift() ?? null;

        if (!nextTrack) {
            this.currentTrack = null;
            this.startInactivityTimeout();
            return;
        }

        try {
            this.isProcessingQueue = true;
            logger.debug(`[${this.guildId}] Processing queue`);

            this.stopInactivityTimeout();

            const audioResource = await this.createAudioResource(nextTrack);
            this.audioPlayer.unpause();
            this.audioPlayer.play(audioResource);
            this.currentTrack = nextTrack;
            logger.debug(`[${this.guildId}] Started playback of ${nextTrack.title}`);
        } catch (err) {
            logger.error(`[${this.guildId}] Failed to start playback (${nextTrack.title}):`, err);
            this.processQueue();
        } finally {
            this.isProcessingQueue = false;
        }
    }

    private async createAudioResource(track: Track) {
        switch (track.type) {
            case 'youtube':
                const ytdlStream = ytdl(track.url, {
                    filter: 'audioonly',
                    quality: 'highestaudio',
                });

                return createAudioResource(ytdlStream);
            case 'soundcloud':
                const scdlStream = await scdl.default.download(track.url);

                if (!(scdlStream instanceof internal.Readable)) {
                    throw new Error('scdl.download did not return internal.Readable');
                }

                return createAudioResource(scdlStream);
            default:
                throw new Error(`unsupported track type: ${track.type}`);
        }
    }

    private startInactivityTimeout() {
        this.stopInactivityTimeout();
        this.inactivityTimeout = setTimeout(this.destroy.bind(this), INACTIVITY_TIMEOUT_MS);
        logger.debug(`[${this.guildId}] Started inactivity timeout`);
    }

    private stopInactivityTimeout() {
        if (this.inactivityTimeout) {
            clearTimeout(this.inactivityTimeout);
            this.inactivityTimeout = null;
            logger.debug(`[${this.guildId}] Stopped inactivity timeout`);
        }
    }
}

export type Track = {
    title: string;
    author: string;
    authorUrl?: string;
    url: string;
    durationSeconds: number;
    addedBy: Snowflake;
    type: 'youtube' | 'soundcloud';
};
