import { EmbedBuilder, escapeMarkdown, type Snowflake } from 'discord.js';
import type { SessionManager } from '../../session/manager.ts';
import { formatTrackLink } from '../../messages/format.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import { isAdminChannelGuard } from '../helpers.ts';

const MAX_LISTED_SESSIONS = 5;

export const createStatusCommand = ({
    sessionManager,
    adminChannelId,
}: {
    sessionManager: SessionManager;
    adminChannelId: Snowflake;
}) =>
    ({
        handler: {
            handle: (ctx) =>
                isAdminChannelGuard(ctx, adminChannelId, () => {
                    const sessions = sessionManager.getAllForClient(ctx.client);
                    const embedBuilder = new EmbedBuilder().setTitle(`Sessions (${sessions.length})`);
                    if (sessions.length === 0) {
                        embedBuilder.setDescription('No active sessions');
                    } else {
                        embedBuilder.addFields(
                            sessions.slice(0, MAX_LISTED_SESSIONS).map((session) => {
                                const guild = ctx.client.guilds.cache.get(session.guildId);
                                const voiceChannelName = session.voiceChannelId
                                    ? guild?.channels.cache.get(session.voiceChannelId)?.name
                                    : null;

                                return {
                                    name: `${escapeMarkdown(guild?.name ?? '<uncached guild>')} (${session.guildId}) -> ${session.voiceChannelId ? `${escapeMarkdown(voiceChannelName ?? '<uncached channel>')} (${session.voiceChannelId})` : '<unknown channel>'}`,
                                    value:
                                        session.currentTrack === null
                                            ? 'Idle'
                                            : `Playing: ${formatTrackLink(session.currentTrack)}, queue length: ${session.queueSize}`,
                                };
                            }),
                        );

                        if (sessions.length > MAX_LISTED_SESSIONS) {
                            embedBuilder.addFields({
                                name: `+ ${sessions.length - MAX_LISTED_SESSIONS} sessions`,
                                value: '⠀',
                            });
                        }
                    }

                    return ctx.upsertReply({
                        embeds: [embedBuilder.toJSON()],
                    });
                }),
        },
        aliases: ['status'],
    }) satisfies ClassicCommand;
