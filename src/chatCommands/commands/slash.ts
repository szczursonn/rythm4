import { PermissionFlagsBits, type Snowflake } from 'discord.js';
import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';

const OPERATION_ARG = {
    REGISTER: 'add',
    UNREGISTER: 'remove',
} as const;

const ALIAS = 'slash';

export const slashHybridChatCommand = {
    classic: {
        aliases: [ALIAS],
        helpTitle: `${ICONS.CMD.SLASH} Slash`,
        argsParser: (_, argsLine) => {
            const argsLineParts = argsLine
                .toLowerCase()
                .split(' ')
                .map((part) => part.trim())
                .filter(Boolean);

            return {
                operation:
                    argsLineParts[0] === OPERATION_ARG.REGISTER || argsLineParts[0] === OPERATION_ARG.UNREGISTER
                        ? argsLineParts[0]
                        : null,
                guildIdOverride: argsLineParts[1] ?? null,
            };
        },
    },
    contexts: {
        dm: true,
        guild: true,
    },
    handler: async (ctx) => {
        const targetGuildId = ctx.args.guildIdOverride ?? ctx.guildId;

        if (targetGuildId === null || ctx.args.operation === null) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **Usage:** \`${
                    ctx.bot.hybridChatCommandManager.classicCommandPrefix
                }${ALIAS} <${OPERATION_ARG.REGISTER} | ${OPERATION_ARG.UNREGISTER}> <${
                    ctx.guildId === null ? '' : '?'
                }guildId (default: current)>\``,
                ephemeral: true,
            });
            return;
        }

        const userMember = await ctx.getUserMember();
        if (userMember === null) {
            throw new Error('member is null');
        }

        if (!userMember.permissions.has(PermissionFlagsBits.Administrator)) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **You must be an administrator**`,
                ephemeral: true,
            });
            return;
        }

        await ctx.bot.updateApplicationCommands({
            guildId: targetGuildId,
            operation: ctx.args.operation === 'add' ? 'register' : 'unregister',
        });

        await ctx.upsertReply({
            content: `${ICONS.SUCCESS} **${
                ctx.args.operation === 'add' ? 'Registered' : 'Unregistered'
            } slash commands!**`,
        });
    },
} satisfies HybridChatCommand<{
    operation: 'add' | 'remove' | null;
    guildIdOverride: Snowflake | null;
}>;
