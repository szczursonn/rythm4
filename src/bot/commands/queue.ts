import { EmbedBuilder } from 'discord.js';
import { type Command } from './index.js';
import { formatTime } from '../../utils.js';
import { requiresActiveSession } from './middleware.js';
import { Track } from '../Session.js';

const MAX_ITEMS = 5;

const createEmbedFieldValue = (track: Track): string => {
    const parts = [
        `[Link](${track.url})`,
        formatTime(track.durationSeconds),
        'Author: ' + (track.authorUrl ? `[${track.author}](${track.authorUrl})` : track.author),
        `Requested by <@${track.addedBy}>`,
    ];

    return parts.join(' | ');
};

const queue: Command = {
    name: 'Queue',
    aliases: ['queue', 'q'],
    description: 'Show the song queue',
    icon: '📄',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession(async (ctx, session) => {
        const embedBuilder = new EmbedBuilder().setTitle(`Queue for ${ctx.guild.name}`).setColor('#0189df');

        if (session.currentTrack) {
            embedBuilder.addFields({
                name: `__Playing now__: ${session.currentTrack.title}${session.paused ? ' | **PAUSED**' : ''}`,
                value: createEmbedFieldValue(session.currentTrack),
                inline: false,
            });

            let queueDuration = 0;
            for (let i = 0; i < session.queue.length; i++) {
                const track = session.queue[i]!;
                queueDuration += track.durationSeconds ?? 0;

                if (i < MAX_ITEMS) {
                    embedBuilder.addFields({
                        name: `${i + 1}. ${track.title}`,
                        value: createEmbedFieldValue(track),
                        inline: false,
                    });
                } else if (i === MAX_ITEMS) {
                    embedBuilder.addFields({
                        name: `and ${session.queue.length - MAX_ITEMS} more queued!`,
                        value: '\u2800',
                        inline: false,
                    });
                }
            }

            embedBuilder.setDescription(
                `Queue length: **${formatTime(queueDuration)}**, Looping: ${
                    session.looping ? ':green_circle:' : ':red_circle:'
                }`
            );
        } else {
            embedBuilder.addFields({
                name: 'There is nothing playing on this server.',
                value: '\u2800',
                inline: false,
            });
        }

        return ctx.reply({
            embeds: [embedBuilder.data],
        });
    }),
};

export default queue;
