import type { Snowflake } from 'discord.js';
import { ICON_SUCCESS } from '../../messages/icons.ts';
import { formatTextReplyMessage } from '../../messages/format.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommandRouter } from '../sources/slash/router.ts';
import { replyWithUserError, isAdminChannelGuard } from '../helpers.ts';

const ALIAS = 'slash';
const OPERATION_REGISTER = 'add';
const OPERATION_UNREGISTER = 'remove';

export const createSlashCommand = ({
    adminChannelId,
    slashCommandRouter,
}: {
    adminChannelId: Snowflake;
    slashCommandRouter: SlashCommandRouter;
}) =>
    ({
        handler: {
            handle: (ctx) =>
                isAdminChannelGuard(ctx, adminChannelId, async () => {
                    if (!ctx.args) {
                        await replyWithUserError(
                            ctx,
                            `Usage: \`${ALIAS} <${OPERATION_REGISTER} | ${OPERATION_UNREGISTER}> [guild ID]\``,
                        );
                        return;
                    }

                    const isRegister = ctx.args.operation === OPERATION_REGISTER;
                    await (isRegister
                        ? slashCommandRouter.registerSlashCommands(ctx.client, ctx.args.guildId)
                        : slashCommandRouter.unregisterSlashCommands(ctx.client, ctx.args.guildId));

                    await ctx.upsertReply({
                        content: formatTextReplyMessage(
                            ICON_SUCCESS,
                            `${isRegister ? 'Registered' : 'Unregistered'} slash commands ${ctx.args.guildId ? `in guild \`${ctx.args.guildId}\`` : 'globally'}`,
                        ),
                    });
                }),
        },
        aliases: [ALIAS],
        parseArgs: (_, argsLine) => {
            const [operation, guildId] = argsLine.toLowerCase().split(' ').filter(Boolean);
            if (operation !== OPERATION_REGISTER && operation !== OPERATION_UNREGISTER) {
                return null;
            }

            return {
                operation,
                guildId: guildId ?? null,
            };
        },
    }) satisfies ClassicCommand<{
        operation: typeof OPERATION_REGISTER | typeof OPERATION_UNREGISTER;
        guildId: Snowflake | null;
    } | null>;
