import {
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus,
    entersState,
    joinVoiceChannel,
} from '@discordjs/voice';
import { VoiceChannel } from 'discord.js';
import logger from './logger';

const MAX_REJOIN_ATTEMPTS = 3;

export const initializeVoiceConnection: (
    voiceChannel: VoiceChannel,
    onDestroy: () => void
) => VoiceConnection = (voiceChannel, onDestroy) => {
    const voiceConnection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: voiceChannel.guildId,
        adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    const safeDestroyVoiceConnection = () => {
        if (voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) {
            voiceConnection.destroy();
        }
    };

    let isReadyFailsafeActive = false;
    // https://github.com/discordjs/voice/blob/main/examples/music-bot/src/music/subscription.ts#L32
    voiceConnection.on('stateChange', (oldState, newState) => {
        logger.debug(
            `VoiceConnectionStateChange ${oldState.status} -> ${newState.status} on ${voiceChannel.guildId} (${voiceChannel.guild.name})`
        );
        switch (newState.status) {
            case VoiceConnectionStatus.Destroyed:
                return onDestroy();
            case VoiceConnectionStatus.Disconnected:
                if (
                    newState.reason ===
                        VoiceConnectionDisconnectReason.WebSocketClose &&
                    newState.closeCode === 4014
                ) {
                    // Cannot rejoin manually - wait 5s to determine if kicked or just switching channels
                    entersState(
                        voiceConnection,
                        VoiceConnectionStatus.Connecting,
                        5_000
                    ).catch((_) => {
                        safeDestroyVoiceConnection();
                    });
                } else if (
                    voiceConnection.rejoinAttempts < MAX_REJOIN_ATTEMPTS
                ) {
                    // Can rejoin manually
                    setTimeout(() => {
                        voiceConnection.rejoin();
                    }, (voiceConnection.rejoinAttempts + 1) * 3_000);
                    voiceConnection.rejoin();
                } else {
                    safeDestroyVoiceConnection();
                }
                break;
            case VoiceConnectionStatus.Connecting:
            case VoiceConnectionStatus.Signalling:
                // Prevents infinite loops of Signalling -> Connecting -> Signalling
                if (isReadyFailsafeActive) {
                    return;
                }
                isReadyFailsafeActive = true;
                entersState(
                    voiceConnection,
                    VoiceConnectionStatus.Ready,
                    20_000
                )
                    .catch((_) => {
                        safeDestroyVoiceConnection();
                    })
                    .finally(() => {
                        isReadyFailsafeActive = false;
                    });
                break;
        }
    });

    return voiceConnection;
};
