import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';
import { requiresTrackPlayingMiddleware } from '../middleware.ts';

export const unpauseHybridChatCommand = {
    classic: {
        aliases: ['unpause', 'resume'],
        helpTitle: `${ICONS.CMD.UNPAUSE} Unpause`,
    },
    slash: {
        name: 'unpause',
        description: 'Unpauses playing of current track',
    },
    contexts: {
        guild: true,
    },
    handler: requiresTrackPlayingMiddleware(async (ctx, session) => {
        if (!session.paused) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **I am not paused!**`,
                ephemeral: true,
            });
            return;
        }

        session.paused = false;
        await ctx.upsertReply({
            content: `${ICONS.SUCCESS} **Unpaused!**`,
        });
    }),
} satisfies HybridChatCommand;
