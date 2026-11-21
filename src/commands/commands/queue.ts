import { EmbedBuilder, escapeMarkdown } from 'discord.js';
import type { Track } from '../../media/media.ts';
import type { SessionManager } from '../../session/manager.ts';
import { ICON_LOOP_ON, ICON_LOOP_OFF, ICON_QUEUE } from '../../messages/icons.ts';
import { formatHHMMSSDuration, formatTrackTitle } from '../../messages/format.ts';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import { doesSessionExistGuard } from '../helpers.ts';

const MAX_VISIBLE_TRACKS = 5;
const EMBED_COLOR = '#0189df';
const EMPTY_FIELD_VALUE = '⠀';

const formatTrackDetails = (track: Track) =>
    [
        track.webPageUrl && `[Link](${track.webPageUrl})`,
        track.durationMs !== null && formatHHMMSSDuration(track.durationMs),
    ]
        .filter(Boolean)
        .join(' | ') || EMPTY_FIELD_VALUE;

export const createQueueCommands = ({ sessionManager }: { sessionManager: SessionManager }) => {
    const handler = {
        handle: (ctx) =>
            doesSessionExistGuard(ctx, sessionManager, async (session) => {
                const guild = await ctx.client.guilds.fetch(ctx.guildId);
                const embedBuilder = new EmbedBuilder()
                    .setTitle(`Queue for ${escapeMarkdown(guild.name)}`)
                    .setColor(EMBED_COLOR);

                const currentTrack = session.currentTrack;
                if (currentTrack === null) {
                    embedBuilder.addFields({
                        name: 'There is nothing playing on this server.',
                        value: EMPTY_FIELD_VALUE,
                    });
                } else {
                    embedBuilder.addFields({
                        name: `__Playing now__: ${formatTrackTitle(currentTrack.title)}`,
                        value: formatTrackDetails(currentTrack),
                    });

                    let position = 1;
                    for (const track of session.queue.take(MAX_VISIBLE_TRACKS)) {
                        embedBuilder.addFields({
                            name: `${position++}. ${formatTrackTitle(track.title)}`,
                            value: formatTrackDetails(track),
                        });
                    }

                    if (session.queueSize > MAX_VISIBLE_TRACKS) {
                        embedBuilder.addFields({
                            name: `and ${session.queueSize - MAX_VISIBLE_TRACKS} more queued!`,
                            value: EMPTY_FIELD_VALUE,
                        });
                    }

                    const queueDurationMs = session.queue.reduce((sum, track) => sum + (track.durationMs ?? 0), 0);
                    embedBuilder.setDescription(
                        `Queue length: **${formatHHMMSSDuration(queueDurationMs)}** (${session.queueSize} tracks), Looping: ${session.looping ? ICON_LOOP_ON : ICON_LOOP_OFF}`,
                    );
                }

                return ctx.upsertReply({
                    embeds: [embedBuilder.toJSON()],
                });
            }),
    } satisfies HybridCommandHandler;

    return {
        classic: {
            handler,
            aliases: ['queue', 'q', 'tracklist'],
            help: {
                icon: ICON_QUEUE,
                title: 'Queue',
            },
        } satisfies ClassicCommand,
        slash: {
            handler,
            name: 'queue',
            description: 'Shows the current queue of tracks',
        } satisfies SlashCommand,
    };
};
