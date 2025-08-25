import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';
import { requiresSessionMiddleware } from '../middleware.ts';

export const loopHybridChatCommand = {
    classic: {
        aliases: ['loop'],
        helpTitle: `${ICONS.CMD.LOOP} Loop`,
    },
    slash: {
        name: 'loop',
        description: 'Toggles looping of current track',
    },
    contexts: {
        guild: true,
    },
    handler: requiresSessionMiddleware(async (ctx, session) => {
        session.looping = !session.looping;
        await ctx.upsertReply({
            content: session.looping ? `${ICONS.SUCCESS} **Looping on!**` : `${ICONS.SUCCESS} **Looping off!**`,
        });
    }),
} satisfies HybridChatCommand;
