import { SlashCommandStringOption } from 'discord.js';
import type { MatchTrackSource } from '../../media/media.ts';
import type { SessionManager } from '../../session/manager.ts';
import { ICON_LOADING, ICON_QUEUE_SHUFFLE } from '../../messages/icons.ts';
import { formatTextReplyMessage, formatTrackLink } from '../../messages/format.ts';
import { toShuffled } from '../../utils/shuffle.ts';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import { getOrCreateSessionGuard, replyWithUserError, doesSessionExistGuard } from '../helpers.ts';

const ALIAS = 'shuffle';
const PLAYLIST_OPTION_NAME = 'playlist';

type ShuffleArgs = {
    readonly query: string;
};

export const createShuffleCommands = ({
    sessionManager,
    matchSource,
}: {
    sessionManager: SessionManager;
    matchSource: MatchTrackSource;
}) => {
    const handler = {
        handle: async (ctx) => {
            if (!ctx.args.query) {
                await doesSessionExistGuard(ctx, sessionManager, async (session) => {
                    if (session.queueSize < 2) {
                        await replyWithUserError(ctx, 'There is nothing to shuffle');
                        return;
                    }

                    session.shuffleQueue();
                    await ctx.upsertReply({
                        content: formatTextReplyMessage(ICON_QUEUE_SHUFFLE, 'Shuffled the queue'),
                    });
                });
                return;
            }

            const match = matchSource.match(ctx.args.query);
            if (match?.type !== 'collection') {
                await replyWithUserError(ctx, 'You must provide a valid playlist URL');
                return;
            }

            await getOrCreateSessionGuard(ctx, sessionManager, async (session) => {
                const loadingReplyPromise = ctx.upsertReply({
                    content: formatTextReplyMessage(ICON_LOADING, 'Looking up the playlist...'),
                    suppressEmbeds: true,
                });
                const [collection] = await Promise.all([match.resolve(), loadingReplyPromise]);
                if (collection.tracks.length === 0) {
                    await replyWithUserError(ctx, 'The playlist is empty');
                    return;
                }

                session.enqueue(toShuffled(collection.tracks));
                await ctx.upsertReply({
                    content: formatTextReplyMessage(
                        ICON_QUEUE_SHUFFLE,
                        `Added ${collection.tracks.length} tracks from ${formatTrackLink(collection)} to the queue in random order`,
                    ),
                    suppressEmbeds: true,
                });
            });
        },
    } satisfies HybridCommandHandler<ShuffleArgs>;

    return {
        classic: {
            handler,
            aliases: [ALIAS],
            help: {
                icon: ICON_QUEUE_SHUFFLE,
                title: 'Shuffle',
            },
            parseArgs: (_, argsLine) => ({
                query: argsLine,
            }),
        } satisfies ClassicCommand<ShuffleArgs>,
        slash: {
            handler,
            name: ALIAS,
            description: 'Shuffles the queue, or adds a playlist to the queue in random order',
            options: [
                new SlashCommandStringOption()
                    .setName(PLAYLIST_OPTION_NAME)
                    .setDescription('Playlist URL')
                    .setRequired(false)
                    .toJSON(),
            ],
            parseArgs: (interaction) => ({
                query: interaction.options.getString(PLAYLIST_OPTION_NAME)?.trim() ?? '',
            }),
        } satisfies SlashCommand<ShuffleArgs>,
    };
};
