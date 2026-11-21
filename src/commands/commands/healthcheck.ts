import type { Snowflake } from 'discord.js';
import type { HealthChecker } from '../../healthCheck/checker.ts';
import { ICON_LOADING } from '../../messages/icons.ts';
import { formatHealthCheckResultMessage, formatTextReplyMessage } from '../../messages/format.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import { isAdminChannelGuard } from '../helpers.ts';

export const createHealthCheckCommand = ({
    healthChecker,
    adminChannelId,
}: {
    healthChecker: HealthChecker;
    adminChannelId: Snowflake;
}) =>
    ({
        handler: {
            handle: (ctx) =>
                isAdminChannelGuard(ctx, adminChannelId, async () => {
                    const [failures] = await Promise.all([
                        healthChecker.run(),
                        ctx.upsertReply({
                            content: formatTextReplyMessage(ICON_LOADING, 'Health check is running...'),
                            suppressEmbeds: true,
                        }),
                    ]);

                    await ctx.upsertReply({
                        content: formatHealthCheckResultMessage(failures),
                        suppressEmbeds: true,
                    });
                }),
        },
        aliases: ['healthcheck', 'hc'],
    }) satisfies ClassicCommand;
