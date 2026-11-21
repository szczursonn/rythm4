import { escapeMarkdown, type MessageReference, SlashCommandStringOption } from 'discord.js';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import type { MatchTrackSource, SearchSuggestionsSource, SearchTrackSource } from '../../media/media.ts';
import { DiscordAttachmentTrack } from '../../media/sources/discordAttachment/track.ts';
import type { SessionManager } from '../../session/manager.ts';
import { ICON_PLAY, ICON_LOADING, ICON_SEARCH, ICON_TRACK, ICON_TRACKS } from '../../messages/icons.ts';
import { formatTextReplyMessage, formatTrackLink } from '../../messages/format.ts';
import { replyWithUserError, getOrCreateSessionGuard } from '../helpers.ts';

const ALIASES = ['play', 'p'];
const QUERY_OPTION_NAME = 'query';
const MAX_AUTOCOMPLETE_CHOICES = 25;
const MAX_AUTOCOMPLETE_CHOICE_LENGTH = 50;

type PlayArgs = {
    readonly query: string;
    readonly messageReference: MessageReference | null;
};

export const createPlayCommands = ({
    sessionManager,
    matchSource,
    searchSource,
    suggestionsSource,
}: {
    sessionManager: SessionManager;
    matchSource: MatchTrackSource;
    searchSource: SearchTrackSource;
    suggestionsSource: SearchSuggestionsSource;
}) => {
    const handler = {
        async handle(ctx) {
            if (!ctx.args.query && !ctx.args.messageReference) {
                await replyWithUserError(ctx, `Usage: \`${ALIASES[0]} <search term | url>\``);
                return;
            }

            if (ctx.args.query && ctx.args.messageReference) {
                await replyWithUserError(ctx, 'Either provide a query or reference a message');
                return;
            }

            await getOrCreateSessionGuard(ctx, sessionManager, async (session) => {
                if (ctx.args.messageReference) {
                    if (!ctx.args.messageReference.guildId) {
                        throw new Error('Message reference has no guild id');
                    }
                    if (!ctx.args.messageReference.messageId) {
                        throw new Error('Message reference has no message id');
                    }

                    const guild = await ctx.client.guilds.fetch(ctx.args.messageReference.guildId);
                    const textChannel = await guild.channels.fetch(ctx.args.messageReference.channelId);
                    if (!textChannel) {
                        throw new Error('Text channel does not exist');
                    }
                    if (!textChannel.isSendable()) {
                        throw new Error('Text channel is not sendable');
                    }

                    const message = await textChannel.messages.fetch(ctx.args.messageReference.messageId);
                    const tracks = message.attachments.map((attachment) => new DiscordAttachmentTrack(attachment));

                    if (tracks.length === 0) {
                        await replyWithUserError(ctx, 'The referenced message has no attachments');
                        return;
                    }

                    session.enqueue(tracks);
                    await ctx.upsertReply({
                        content:
                            tracks.length === 1
                                ? formatTextReplyMessage(
                                      ICON_TRACK,
                                      `Added ${formatTrackLink(tracks[0]!)} to the queue`,
                                  )
                                : formatTextReplyMessage(ICON_TRACK, `Added ${tracks.length} to the queue`),
                    });
                    return;
                }

                const match = matchSource.match(ctx.args.query);
                if (!match || match.type === 'search') {
                    const [track] = await Promise.all([
                        match ? match.resolve() : searchSource.search(ctx.args.query),
                        ctx.upsertReply({
                            content: formatTextReplyMessage(
                                ICON_SEARCH,
                                `Searching for *${escapeMarkdown(match ? match.term : ctx.args.query)}*...`,
                            ),
                            suppressEmbeds: !!match,
                        }),
                    ]);

                    if (!track) {
                        await replyWithUserError(ctx, 'No track found');
                        return;
                    }

                    session.enqueue([track]);
                    await ctx.upsertReply({
                        content: formatTextReplyMessage(ICON_TRACK, `Added ${formatTrackLink(track)} to the queue`),
                    });
                    return;
                }

                if (match.type === 'track') {
                    const [track] = await Promise.all([
                        match.resolve(),
                        ctx.upsertReply({
                            content: formatTextReplyMessage(
                                ICON_LOADING,
                                `Looking up ${escapeMarkdown(ctx.args.query)}...`,
                            ),
                            suppressEmbeds: true,
                        }),
                    ]);

                    session.enqueue([track]);
                    await ctx.upsertReply({
                        content: formatTextReplyMessage(ICON_TRACK, `Added ${formatTrackLink(track)} to the queue`),
                        suppressEmbeds: true,
                    });
                    return;
                }

                const [collection] = await Promise.all([
                    match.resolve(),
                    ctx.upsertReply({
                        content: formatTextReplyMessage(
                            ICON_LOADING,
                            `Looking up ${escapeMarkdown(ctx.args.query)}...`,
                        ),
                        suppressEmbeds: true,
                    }),
                ]);

                if (collection.tracks.length === 0) {
                    await replyWithUserError(ctx, 'The playlist is empty');
                    return;
                }

                session.enqueue(collection.tracks);
                await ctx.upsertReply({
                    content: formatTextReplyMessage(
                        ICON_TRACKS,
                        `Added ${collection.tracks.length} tracks from ${formatTrackLink(collection)} to the queue`,
                    ),
                    suppressEmbeds: true,
                });
            });
        },
        async handleAutocomplete(ctx) {
            const term = ctx.args.query;
            if (ctx.focusedArg !== QUERY_OPTION_NAME || !term || URL.canParse(term)) {
                return [];
            }

            const suggestions = await suggestionsSource.suggest(term);
            return suggestions.slice(0, MAX_AUTOCOMPLETE_CHOICES).map((suggestion) => ({
                name: `${ICON_SEARCH} ${suggestion}`.slice(0, MAX_AUTOCOMPLETE_CHOICE_LENGTH),
                value: suggestion.slice(0, MAX_AUTOCOMPLETE_CHOICE_LENGTH),
            }));
        },
    } satisfies HybridCommandHandler<PlayArgs>;

    return {
        classic: {
            handler,
            aliases: ALIASES,
            help: {
                icon: ICON_PLAY,
                title: 'Play',
            },
            parseArgs: (message, argsLine) => ({
                query: argsLine,
                messageReference: message.reference,
            }),
        } satisfies ClassicCommand<PlayArgs>,
        slash: {
            handler,
            name: ALIASES[0]!,
            description: 'Adds a track or a playlist to the queue',
            options: [
                new SlashCommandStringOption()
                    .setName(QUERY_OPTION_NAME)
                    .setDescription('URL or search query')
                    .setRequired(true)
                    .setAutocomplete(true)
                    .toJSON(),
            ],
            parseArgs: (interaction) => ({
                query: interaction.options.getString(QUERY_OPTION_NAME)?.trim() ?? '',
                messageReference: null,
            }),
        } satisfies SlashCommand<PlayArgs>,
    };
};
