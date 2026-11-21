import events from 'node:events';
import type { VoiceBasedChannel } from 'discord.js';
import {
    type AudioPlayer,
    joinVoiceChannel,
    VoiceConnectionDisconnectReason,
    type VoiceConnectionState,
    VoiceConnectionStatus,
} from '@discordjs/voice';
import type { Logger } from '../logger/logger.ts';
import { RestartableTimeout, FixedDelayRestartableTimeout } from '../utils/restartableTimeout.ts';

const CHANNEL_SWITCH_CHECK_TIMEOUT_MS = 1000 * 5;
const JOIN_TIMEOUT_MS = 1000 * 20;
const REJOIN_DELAY_STEP_MS = 2_500;
const MAX_REJOIN_ATTEMPTS = 3;
const CLOSE_CODE_DISCONNECTED = 4014;

export type SessionVoiceConnectionDestroyReason = 'requested' | 'kicked' | 'disconnected';

export class SessionVoiceConnection extends events.EventEmitter<{
    destroyed: [reason: SessionVoiceConnectionDestroyReason];
}> {
    readonly #logger;
    readonly #voiceConnection;

    readonly #channelSwitchCheckTimeout = new FixedDelayRestartableTimeout(CHANNEL_SWITCH_CHECK_TIMEOUT_MS);
    readonly #joinTimeout = new FixedDelayRestartableTimeout(JOIN_TIMEOUT_MS);
    readonly #triggerRejoinTimeout = new RestartableTimeout();

    #isDestroyed = false;

    public constructor({
        voiceChannel,
        audioPlayer,
        logger,
    }: {
        readonly voiceChannel: VoiceBasedChannel;
        readonly audioPlayer: AudioPlayer;
        readonly logger: Logger;
    }) {
        super();
        this.#logger = logger;

        this.#channelSwitchCheckTimeout.on('fired', this.#handleChannelSwitchCheckTimeoutFired.bind(this));
        this.#joinTimeout.on('fired', this.#handleJoinTimeoutFired.bind(this));
        this.#triggerRejoinTimeout.on('fired', this.#handleTriggerRejoinTimeoutFired.bind(this));

        this.#voiceConnection = joinVoiceChannel({
            guildId: voiceChannel.guildId,
            channelId: voiceChannel.id,
            adapterCreator: voiceChannel.guild.voiceAdapterCreator,
            group: voiceChannel.client.user.id,
            selfDeaf: true,
        });
        this.#voiceConnection.on('stateChange', this.#handleConnectionStateChange.bind(this));
        this.#voiceConnection.on('error', this.#handleConnectionError.bind(this));
        this.#voiceConnection.on('debug', this.#handleConnectionDebug.bind(this));
        this.#voiceConnection.subscribe(audioPlayer);
    }

    public get channelId() {
        return this.#voiceConnection.joinConfig.channelId;
    }

    public destroy() {
        this.#destroy('requested');
    }

    #destroy(reason: SessionVoiceConnectionDestroyReason) {
        if (this.#isDestroyed) {
            return;
        }
        this.#isDestroyed = true;

        if (this.#voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            this.#voiceConnection.destroy();
        }

        this.#channelSwitchCheckTimeout.stop();
        this.#joinTimeout.stop();
        this.#triggerRejoinTimeout.stop();

        this.emit('destroyed', reason);
    }

    #handleChannelSwitchCheckTimeoutFired() {
        this.#destroy('kicked');
    }

    #handleJoinTimeoutFired() {
        this.#destroy('disconnected');
    }

    #handleTriggerRejoinTimeoutFired() {
        this.#voiceConnection.rejoin();
    }

    #handleConnectionStateChange(oldState: VoiceConnectionState, newState: VoiceConnectionState) {
        this.#logger.debug('Voice connection state change', {
            oldStatus: oldState.status,
            newStatus: newState.status,
        });

        switch (newState.status) {
            case VoiceConnectionStatus.Destroyed:
                this.#destroy('disconnected');
                break;
            case VoiceConnectionStatus.Disconnected:
                if (
                    newState.reason === VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === CLOSE_CODE_DISCONNECTED
                ) {
                    // when switching channels the connection reconnects by itself
                    // no reconnect after a while = kicked from vc
                    this.#channelSwitchCheckTimeout.restart();
                } else if (this.#voiceConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS) {
                    this.#triggerRejoinTimeout.restart(
                        (this.#voiceConnection.rejoinAttempts + 1) * REJOIN_DELAY_STEP_MS,
                    );
                } else {
                    this.#destroy('disconnected');
                }
                break;
            case VoiceConnectionStatus.Connecting:
                this.#channelSwitchCheckTimeout.stop();
                this.#joinTimeout.restart();
                this.#triggerRejoinTimeout.stop();
                break;
            case VoiceConnectionStatus.Signalling:
                this.#joinTimeout.restart();
                this.#triggerRejoinTimeout.stop();
                break;
            case VoiceConnectionStatus.Ready:
                this.#channelSwitchCheckTimeout.stop();
                this.#joinTimeout.stop();
                this.#triggerRejoinTimeout.stop();
                break;
        }
    }

    #handleConnectionError(err: Error) {
        this.#logger.error('discord.js voice connection error', {
            err,
        });
    }

    #handleConnectionDebug(message: string) {
        this.#logger.debug('discord.js voice connection debug', {
            message,
        });
    }
}
