import { memoryUsage, uptime } from 'node:process';
import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';
import { requiresAppAdmin } from '../middleware.ts';
import { formatDuration } from '../../utils.ts';

export const statusHybridChatCommand = {
    classic: {
        aliases: ['status'],
        helpTitle: `${ICONS.CMD.STATUS} Status`,
    },
    contexts: {
        dm: true,
    },
    handler: requiresAppAdmin(async (ctx) => {
        const generalInfoEmbedBuilder = new EmbedBuilder().setTitle('General Info').addFields(
            {
                name: 'Memory usage',
                value: '`' + JSON.stringify(memoryUsage()) + '`',
                inline: false,
            },
            {
                name: 'Uptime',
                value: '`' + formatDuration(Math.floor(uptime())) + '`',
                inline: false,
            }
        );

        const sessionInfos = await Promise.all(
            ctx.bot.sessionManager.getAllSessions().map(async (session) => {
                const [guild, voiceChannel] = await Promise.all([
                    ctx.bot.client.guilds.fetch(session.guildId),
                    session.voiceChannelId ? ctx.bot.client.channels.fetch(session.voiceChannelId) : null,
                ]);

                return {
                    session,
                    guild,
                    voiceChannel: voiceChannel?.isVoiceBased() ? voiceChannel : null,
                };
            })
        );

        const sessionInfosEmbedBuilder = new EmbedBuilder().setTitle('Sessions');
        if (sessionInfos.length === 0) {
            sessionInfosEmbedBuilder.setDescription('No active sessions');
        } else {
            for (const sessionInfo of sessionInfos) {
                sessionInfosEmbedBuilder.addFields({
                    name: `${escapeMarkdown(sessionInfo.guild.name)} (${sessionInfo.guild.id}) -> ${
                        sessionInfo.voiceChannel?.name ?? '<unknown channel>'
                    } (${sessionInfo.session.voiceChannelId})`,
                    value:
                        sessionInfo.session.currentTrack === null
                            ? 'Idle'
                            : `Playing: ${
                                  sessionInfo.session.currentTrack.url === null
                                      ? escapeMarkdown(sessionInfo.session.currentTrack.title)
                                      : `[${escapeMarkdown(sessionInfo.session.currentTrack.title)}](${
                                            sessionInfo.session.currentTrack.url
                                        })`
                              } ${sessionInfo.session.currentTrack.title}, queue length: ${
                                  sessionInfo.session.queue.length
                              }`,
                    inline: false,
                });
            }
        }

        await ctx.upsertReply({
            embeds: [generalInfoEmbedBuilder.toJSON(), sessionInfosEmbedBuilder.toJSON()],
        });
    }),
} satisfies HybridChatCommand;
