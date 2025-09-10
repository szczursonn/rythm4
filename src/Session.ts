import { MessageFlags, type Snowflake, type VoiceBasedChannel } from 'discord.js';
import {
    type AudioPlayerState,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    entersState,
    joinVoiceChannel,
    NoSubscriberBehavior,
    type VoiceConnectionState,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import type { Logger } from 'winston';
import type { MusicBot } from './MusicBot.js';
import type { Track } from './tracks/TrackManager.ts';
import { ERROR_LOG_KEY, formatError } from './loggerUtils.ts';
import { ICONS } from './icons.ts';

const DURATION = {
    INACTIVITY_TIMEOUT: 1000 * 60 * 30,
    CHANNEL_SWITCH_CHECK_TIMEOUT: 1000 * 5,
    JOIN_TIMEOUT: 1000 * 20,
    REJOIN_BASE_DELAY: 2_500,
} as const;

const MAX_REJOIN_ATTEMPTS = 3;
const CLOSE_CODE_DISCONNECTED = 4014;

export class Session {
    private readonly voiceConnection;
    private readonly audioPlayer;
    public readonly logger: Logger;

    private inactivityTimeoutId: number | null = null;
    private isDestroyed = false;
    private isProcessingQueue = false;

    #looping = false;
    #currentTrack: Track | null = null;
    #queue: Track[] = [];

    public constructor(
        public readonly bot: MusicBot,
        public readonly notificationsChannelId: Snowflake | null,
        voiceChannel: VoiceBasedChannel
    ) {
        this.logger = bot.logger.child({
            guildId: voiceChannel.guildId,
        });

        this.voiceConnection = joinVoiceChannel({
            guildId: voiceChannel.guildId,
            channelId: voiceChannel.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            selfDeaf: true,
        });
        this.voiceConnection.on('stateChange', this.handleVoiceConnectionStateChange.bind(this));
        this.voiceConnection.on('error', this.handleVoiceConnectionError.bind(this));

        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        this.audioPlayer.on('stateChange', this.handleAudioPlayerStateChange.bind(this));
        this.audioPlayer.on('error', this.handleAudioPlayerError.bind(this));

        this.voiceConnection.subscribe(this.audioPlayer);

        this.logger.info('Session started');
        this.startInactivityTimeout();

        this.bot.sessionManager.registerSession(this);
    }

    public get guildId() {
        return this.voiceConnection.joinConfig.guildId;
    }

    public get voiceChannelId() {
        return this.voiceConnection.joinConfig.channelId;
    }

    public get notificationsChannel() {
        if (this.notificationsChannelId === null) {
            return null;
        }

        const channel = this.bot.client.channels.cache.get(this.notificationsChannelId);
        if (!channel || !channel.isSendable()) {
            return null;
        }

        return channel;
    }

    public get looping() {
        return this.#looping;
    }
    public set looping(newValue) {
        if (this.#looping !== newValue) {
            this.#looping = newValue;
            this.logger.debug('Session looping change', {
                looping: newValue,
            });
        }
    }

    public get paused() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Paused;
    }
    public set paused(newValue: boolean) {
        this.audioPlayer[newValue ? 'pause' : 'unpause']();
    }

    public get currentTrack() {
        return this.#currentTrack;
    }

    public get queue() {
        return this.#queue as Readonly<Track[]>;
    }

    public enqueue(...tracks: Track[]) {
        this.#queue.push(...tracks);
        tracks.forEach((track) =>
            this.logger.debug('Enqueued track', {
                trackTitle: track.title,
                trackURL: track.url,
            })
        );
        this.processQueue();
    }

    public skipCurrentTrack() {
        this.looping = false;
        this.audioPlayer.stop();
    }

    public destroy(logReason: string) {
        if (this.isDestroyed) {
            return;
        }
        this.isDestroyed = true;

        this.stopInactivityTimeout();
        this.audioPlayer.stop(true);
        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.voiceConnection.destroy();
        }
        this.bot.sessionManager.unregisterSession(this);

        this.logger.info('Session destroyed', { reason: logReason });
    }

    private async processQueue() {
        if (this.isProcessingQueue || this.isDestroyed || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
            return;
        }

        const nextTrack = this.looping ? this.currentTrack : this.#queue.shift() ?? null;
        if (nextTrack === null) {
            this.#currentTrack = null;
            this.startInactivityTimeout();
            return;
        }
        this.stopInactivityTimeout();

        this.isProcessingQueue = true;

        try {
            const { stream, resolvedTrack } = await nextTrack.createStream();
            const audioResource = createAudioResource(stream);

            this.#currentTrack = resolvedTrack;
            this.paused = false;
            this.audioPlayer.play(audioResource);

            this.logger.debug('Started playback', {
                trackTitle: resolvedTrack.title,
                trackURL: resolvedTrack.url,
            });
        } catch (err) {
            this.logger.error('Failed to start playback', {
                [ERROR_LOG_KEY]: formatError(err),
                trackTitle: nextTrack.title,
            });
            this.sendNotificationMessage(`${ICONS.APP_ERROR} **There was an unexpected error when starting playback**`);
        } finally {
            this.isProcessingQueue = false;
            this.processQueue();
        }
    }

    private handleVoiceConnectionStateChange(oldState: VoiceConnectionState, newState: VoiceConnectionState) {
        this.logger.debug('Voice connection state change', {
            oldStatus: oldState.status,
            newStatus: newState.status,
        });

        switch (newState.status) {
            case VoiceConnectionStatus.Destroyed:
                this.destroy('voice connection destroyed');
                break;
            case VoiceConnectionStatus.Disconnected:
                if ('closeCode' in newState && newState.closeCode === CLOSE_CODE_DISCONNECTED) {
                    // If switching channels - should reconnect automatically. No reconnect = kicked from VC
                    entersState(
                        this.voiceConnection,
                        VoiceConnectionStatus.Connecting,
                        DURATION.CHANNEL_SWITCH_CHECK_TIMEOUT
                    ).catch(() => this.destroy('channel switch check timeout - kicked from vc'));
                } else if (this.voiceConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS) {
                    // Manual reconnect
                    setTimeout(
                        () => this.voiceConnection.rejoin(),
                        (this.voiceConnection.rejoinAttempts + 1) * DURATION.REJOIN_BASE_DELAY
                    );
                } else {
                    // Rejoin attempts exhausted
                    this.destroy('rejoin failed');
                }
                break;
            case VoiceConnectionStatus.Connecting:
            case VoiceConnectionStatus.Signalling:
                entersState(this.voiceConnection, VoiceConnectionStatus.Ready, DURATION.JOIN_TIMEOUT).catch(() =>
                    this.destroy('connecting/signalling timed out')
                );
                break;
        }
    }

    private handleVoiceConnectionError(err: Error) {
        this.logger.error('Voice connection error', {
            [ERROR_LOG_KEY]: formatError(err),
        });
    }

    private handleAudioPlayerStateChange(oldState: AudioPlayerState, newState: AudioPlayerState) {
        this.logger.debug('Audio player state change', {
            oldStatus: oldState.status,
            newStatus: newState.status,
        });

        if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
            this.processQueue();
        }
    }

    private handleAudioPlayerError(err: Error) {
        this.sendNotificationMessage(`${ICONS.APP_ERROR} **There was an unexpected error during playback.**`);

        this.logger.error('Audio player error', {
            [ERROR_LOG_KEY]: formatError(err),
        });
    }

    private async sendNotificationMessage(message: string) {
        try {
            await this.notificationsChannel?.send({
                content: message,
                flags: MessageFlags.SuppressNotifications,
            });
        } catch (err) {
            this.logger.error('Failed to send notification message', {
                [ERROR_LOG_KEY]: formatError(err),
            });
        }
    }

    private startInactivityTimeout() {
        this.stopInactivityTimeout();
        this.inactivityTimeoutId = Number(setTimeout(this.destroy.bind(this), DURATION.INACTIVITY_TIMEOUT));
        this.logger.debug('Started session inactivity timeout');
    }

    private stopInactivityTimeout() {
        if (this.inactivityTimeoutId === null) {
            return;
        }

        clearTimeout(this.inactivityTimeoutId);
        this.inactivityTimeoutId = null;
        this.logger.debug('Stopped session inactivity timeout');
    }
}
