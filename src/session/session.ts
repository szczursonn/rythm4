import events from 'node:events';
import { MessageFlags, type Snowflake, type VoiceBasedChannel } from 'discord.js';
import type { Logger } from '../logger/logger.ts';
import type { Track } from '../media/media.ts';
import { ICON_APP_ERROR } from '../messages/icons.ts';
import { formatTextReplyMessage, formatTrackLink } from '../messages/format.ts';
import { FixedDelayRestartableTimeout } from '../utils/restartableTimeout.ts';
import { SessionPlayer } from './player.ts';
import { SessionVoiceConnection, type SessionVoiceConnectionDestroyReason } from './voiceConnection.ts';

export type SessionEndReason = SessionVoiceConnectionDestroyReason | 'inactive';

export type SessionOptions = {
    readonly inactivityTimeoutMs: number;
};

export class Session extends events.EventEmitter<{
    destroyed: [reason: SessionEndReason];
}> {
    public readonly client;
    public readonly guildId;

    readonly #logger;
    readonly #notificationChannelId;
    readonly #player;
    readonly #voiceConnection;
    readonly #inactivityTimeout;

    #destroyed = false;

    public constructor({
        voiceChannel,
        notificationChannelId,
        logger,
        inactivityTimeoutMs,
    }: {
        readonly voiceChannel: VoiceBasedChannel;
        readonly notificationChannelId: Snowflake | null;
        readonly logger: Logger;
        readonly inactivityTimeoutMs: number;
    }) {
        super();

        this.client = voiceChannel.client;
        this.guildId = voiceChannel.guildId;
        this.#notificationChannelId = notificationChannelId;
        this.#logger = logger.withAttrs({
            botUserId: voiceChannel.client.user.id,
            guildId: voiceChannel.guildId,
        });
        this.#inactivityTimeout = new FixedDelayRestartableTimeout(inactivityTimeoutMs).on(
            'fired',
            this.#handleInactivityTimeoutFired.bind(this),
        );

        this.#player = new SessionPlayer({
            logger: this.#logger.withModule('player'),
        });
        this.#player.on('idleChange', this.#updateInactivityTimeout.bind(this));
        this.#player.on('loadError', this.#handlePlayerLoadError.bind(this));
        this.#player.on('playbackError', this.#handlePlayerPlaybackError.bind(this));

        this.#voiceConnection = new SessionVoiceConnection({
            voiceChannel,
            audioPlayer: this.#player.audioPlayer,
            logger: this.#logger.withModule('voiceConn'),
        });
        this.#voiceConnection.on('destroyed', this.#handleVoiceConnectionDestroyed.bind(this));

        // the player starts idle
        this.#updateInactivityTimeout();

        this.#logger.info('Session started', {
            voiceChannelId: voiceChannel.id,
        });
    }

    public get voiceChannelId() {
        return this.#voiceConnection.channelId;
    }

    public get isDestroyed() {
        return this.#destroyed;
    }

    public get looping() {
        return this.#player.looping;
    }
    public set looping(newValue) {
        this.#player.looping = newValue;
    }

    public get currentTrack() {
        return this.#player.currentTrack;
    }

    public get queue() {
        return this.#player.queue;
    }

    public get queueSize() {
        return this.#player.queueSize;
    }

    public enqueue(tracks: readonly Track[]) {
        this.#player.enqueue(tracks);
    }

    public clearQueue() {
        this.#player.clearQueue();
    }

    public shuffleQueue() {
        this.#player.shuffleQueue();
    }

    public skip() {
        this.#player.skip();
    }

    public destroy() {
        this.#destroy('requested');
    }

    #destroy(reason: SessionEndReason) {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;

        this.#inactivityTimeout.stop();
        this.#player.destroy();
        this.#voiceConnection.destroy();

        this.#logger.info('Session destroyed', { reason });
        this.emit('destroyed', reason);
    }

    #handleVoiceConnectionDestroyed(reason: SessionVoiceConnectionDestroyReason) {
        this.#destroy(reason);
    }

    #handleInactivityTimeoutFired() {
        this.#logger.debug('Inactivity timeout fired');
        this.#destroy('inactive');
    }

    #handlePlayerLoadError(_err: unknown, track: Track) {
        void this.#notify(
            formatTextReplyMessage(
                ICON_APP_ERROR,
                `An unexpected error has occured while loading ${formatTrackLink(track)} - it has been removed from the queue`,
            ),
        );
    }

    #handlePlayerPlaybackError(_err: unknown, track: Track) {
        void this.#notify(
            formatTextReplyMessage(
                ICON_APP_ERROR,
                `An unexpected error has occured while playing ${formatTrackLink(track)}`,
            ),
        );
    }

    #updateInactivityTimeout() {
        if (!this.#destroyed && this.#player.isIdle) {
            this.#inactivityTimeout.restart();
        } else {
            this.#inactivityTimeout.stop();
        }
    }

    async #notify(content: string) {
        if (!this.#notificationChannelId) {
            return;
        }

        try {
            const channel = await this.client.channels.fetch(this.#notificationChannelId);
            if (!channel) {
                throw new Error('Notification channel not found');
            }
            if (!channel.isSendable()) {
                throw new Error('Notification channel is not sendable');
            }

            await channel.send({
                content,
                flags: [MessageFlags.SuppressNotifications, MessageFlags.SuppressEmbeds],
            });
        } catch (err) {
            this.#logger.error('Failed to send session notification', {
                err,
                notificationChannelId: this.#notificationChannelId,
            });
        }
    }
}
