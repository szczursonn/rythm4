import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';
import { requiresTrackPlayingMiddleware } from '../middleware.ts';

export const pauseHybridChatCommand = {
    classic: {
        aliases: ['pause'],
        helpTitle: `${ICONS.CMD.PAUSE} Pause`,
    },
    slash: {
        name: 'pause',
        description: 'Pauses playing of current track',
    },
    contexts: {
        guild: true,
    },
    handler: requiresTrackPlayingMiddleware(async (ctx, session) => {
        if (session.paused) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **I am already paused!**`,
                ephemeral: true,
            });
            return;
        }

        session.paused = true;
        await ctx.upsertReply({
            content: `${ICONS.SUCCESS} **Paused!**`,
        });
    }),
} satisfies HybridChatCommand;
