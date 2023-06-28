import { EmbedBuilder } from 'discord.js';
import { Command } from '.';
import { formatTime } from '../utils';
import { requiresActiveSession } from './middleware';

const queue: Command = {
    name: 'Queue',
    aliases: ['queue', 'q'],
    description: 'Show the song queue',
    icon: '📄',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        const embed = new EmbedBuilder()
            .setTitle(`Queue for ${sender.guild.name}`)
            .setColor('#0189df');

        const currentTrack = session.currentTrack;
        if (currentTrack) {
            embed.addFields({
                name: `__Playing now__: ${currentTrack.title}${
                    session.paused ? ' | **PAUSED**' : ''
                }`,
                value: `Length: \`${formatTime(
                    currentTrack.durationSeconds
                )}\` | Requested by <@${currentTrack.addedBy}>`,
                inline: false,
            });

            const queue = session.queue;
            let queueDuration = 0;
            for (let i = 0; i < queue.length; i++) {
                const track = queue[i]!;
                queueDuration += track.durationSeconds ?? 0;
                if (i < 5) {
                    embed.addFields({
                        name: `\`${i + 1}.\` ${track.title}`,
                        value: `${track.url}\nLength: \`${formatTime(
                            track.durationSeconds
                        )}\` | Requested by <@${track.addedBy}>`,
                        inline: false,
                    });
                } else if (i === 5) {
                    embed.addFields({
                        name: `and ${queue.length - 5} more videos queued!`,
                        value: '\u2800',
                        inline: false,
                    });
                }
            }
            embed.setDescription(
                `Queue length: **${formatTime(queueDuration)}**\nLooping: ${
                    session.looping ? ':green_circle:' : ':red_circle:'
                }`
            );
        } else {
            embed.addFields({
                name: 'There is nothing playing on this server.',
                value: '\u2800',
                inline: false,
            });
        }

        await reply(embed);
    }),
};

export default queue;
