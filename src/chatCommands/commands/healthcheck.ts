import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';
import { requiresAppAdmin } from '../middleware.ts';
import { TrackHealthChecker } from '../../tracks/TrackHealthChecker.ts';

export const healthCheckHybridChatCommand = {
    classic: {
        aliases: ['healthcheck', 'health', 'hc'],
        helpTitle: `${ICONS.CMD.HEALTH_CHECK} Health check`,
    },
    contexts: {
        dm: true,
    },
    handler: requiresAppAdmin(async (ctx) => {
        const initialReplyPromise = ctx
            .upsertReply({
                content: `${ICONS.LOADING} **Health check is running...**`,
                defer: true,
            })
            .catch((_) => {});

        const [failures] = await Promise.all([ctx.bot.trackHealthChecker.runHealthCheck(), initialReplyPromise]);

        await ctx.upsertReply({
            content:
                failures.length === 0
                    ? `${ICONS.SUCCESS} **All good!**`
                    : TrackHealthChecker.createFailureMessage(failures),
            suppressEmbeds: true,
        });
    }),
} satisfies HybridChatCommand;
