import { escapeMarkdown, SlashCommandStringOption } from 'discord.js';
import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';

const ALIASES = ['play', 'p'];
const QUERY_OPTION_NAME = 'query';

export const playHybridChatCommand = {
    classic: {
        aliases: ALIASES,
        helpTitle: `${ICONS.CMD.PLAY} Play`,
        argsParser: (_, argsLine) => ({
            query: argsLine,
        }),
    },
    slash: {
        name: ALIASES[0]!,
        description: 'Adds a specified track to the playback queue',
        options: [
            new SlashCommandStringOption()
                .setName(QUERY_OPTION_NAME)
                .setDescription('Track URL or search query')
                .setRequired(true)
                .setAutocomplete(true)
                .toJSON(),
        ],
        argsParser: (interaction) => ({
            query: interaction.options.getString(QUERY_OPTION_NAME)?.trim() ?? '',
        }),
    },
    contexts: {
        guild: true,
    },
    handler: async (ctx) => {
        if (!ctx.args.query) {
            // this can only happen for classic commands
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **Usage:** \`${ctx.bot.hybridChatCommandManager.classicCommandPrefix}${ALIASES[0]} <search term | url>\``,
                ephemeral: true,
            });
            return;
        }

        const userVoiceChannel = await ctx.getUserVoiceChannel();
        if (userVoiceChannel === null) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **You must be in a voice channel!**`,
                ephemeral: true,
            });
            return;
        }

        const session = ctx.bot.sessionManager.getOrCreateSession(userVoiceChannel, ctx.channelId);
        if (userVoiceChannel.id !== session.voiceChannelId) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **You must be in the same voice channel as me!**`,
                ephemeral: true,
            });
            return;
        }

        let queryResult = null as Awaited<ReturnType<typeof ctx.bot.trackManager.handleQuery>>;
        (
            await Promise.allSettled([
                ctx.bot.trackManager.handleQuery(ctx.args.query).then((value) => (queryResult = value)),
                ctx.upsertReply({
                    content: `${ICONS.LOADING} **...**`,
                    defer: true,
                }),
            ])
        ).forEach((promiseResult) => {
            if (promiseResult.status === 'rejected') {
                throw promiseResult.reason;
            }
        });

        if (queryResult === null) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **Not found**`,
            });
            return;
        }

        switch (queryResult.type) {
            case 'track':
                session.enqueue(queryResult.track);

                const escapedTrackTitle = escapeMarkdown(queryResult.track.title);
                await ctx.upsertReply({
                    content: `${ICONS.TRACK} **Added ${
                        queryResult.track.url === null
                            ? escapedTrackTitle
                            : `[${escapedTrackTitle}](${queryResult.track.url})`
                    } to the queue!**`,
                });
                break;
            case 'set':
                session.enqueue(...queryResult.tracks);

                const escapedSetTitle = escapeMarkdown(queryResult.title ?? '<unknown name>');
                await ctx.upsertReply({
                    content: `${ICONS.TRACKS} **Added ${queryResult.tracks.length} tracks from ${
                        queryResult.url === null ? escapedSetTitle : `[${escapedSetTitle}](${queryResult.url})`
                    } to the queue!**`,
                });
                break;
        }
    },
    autocompleteHandler: async (ctx) => {
        if (!ctx.args.query || URL.canParse(ctx.args.query)) {
            return [];
        }

        const results = await ctx.bot.trackManager.handleAutocompleteQuery(ctx.args.query);

        return results.map((result) => {
            if (result.type === 'track') {
                return {
                    name: `${ICONS.TRACK} ${escapeMarkdown(result.title)}`,
                    value: result.url,
                };
            }

            if (result.type === 'set') {
                return {
                    name: `${ICONS.TRACKS} ${escapeMarkdown(result.title)}`,
                    value: result.url,
                };
            }

            return {
                name: `${ICONS.SEARCH} ${escapeMarkdown(result.text)}`,
                value: result.text,
            };
        });
    },
} satisfies HybridChatCommand<{ query: string }>;
