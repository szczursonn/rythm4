import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import type { HybridChatCommand } from '../index.ts';
import type { Track } from '../../tracks/TrackManager.ts';
import { requiresSessionMiddleware } from '../middleware.ts';
import { ICONS } from '../../icons.ts';
import { formatTime } from '../../utils.ts';

const QUEUE_MAX_VISIBLE_ITEMS = 5;
const createQueueEmbedFieldValue = (track: Track): string => {
    const parts = [
        track.url && `[Link](${track.url})`,
        track.durationSeconds && formatTime(track.durationSeconds),
        track.authorName && `Author: ${escapeMarkdown(track.authorName)}`,
    ];

    return parts.filter(Boolean).join(' | ');
};

export const queueHybridChatCommand = {
    classic: {
        aliases: ['queue', 'q', 'tracklist'],
        helpTitle: `${ICONS.CMD.QUEUE} Queue`,
    },
    slash: {
        name: 'queue',
        description: 'Shows the current queue of tracks',
    },
    contexts: {
        guild: true,
    },
    handler: requiresSessionMiddleware(async (ctx, session) => {
        const embedBuilder = new EmbedBuilder()
            .setTitle(`Queue for ${session.bot.client.guilds.cache.get(session.guildId)!.name}`)
            .setColor('#0189df');
        if (session.currentTrack) {
            embedBuilder.addFields({
                name: `__Playing now__: ${session.currentTrack.title}${session.paused ? ' | **PAUSED**' : ''}`,
                value: createQueueEmbedFieldValue(session.currentTrack),
                inline: false,
            });

            let queueDurationSeconds = 0;
            for (let i = 0; i < session.queue.length; i++) {
                const track = session.queue[i]!;
                queueDurationSeconds += track.durationSeconds ?? 0;

                if (i < QUEUE_MAX_VISIBLE_ITEMS) {
                    embedBuilder.addFields({
                        name: `${i + 1}. ${escapeMarkdown(track.title)}`,
                        value: createQueueEmbedFieldValue(track),
                        inline: false,
                    });
                } else if (i === QUEUE_MAX_VISIBLE_ITEMS) {
                    embedBuilder.addFields({
                        name: `and ${session.queue.length - QUEUE_MAX_VISIBLE_ITEMS} more queued!`,
                        value: '\u2800',
                        inline: false,
                    });
                }
            }

            embedBuilder.setDescription(
                `Queue length: **${formatTime(queueDurationSeconds)}**, Looping: ${
                    session.looping ? ICONS.LOOP_ON : ICONS.LOOP_OFF
                }`
            );
        } else {
            embedBuilder.addFields({
                name: 'There is nothing playing on this server.',
                value: '\u2800',
                inline: false,
            });
        }

        await ctx.upsertReply({
            embeds: [embedBuilder.toJSON()],
        });
    }),
} satisfies HybridChatCommand;
