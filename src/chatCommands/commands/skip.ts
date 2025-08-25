import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';
import { requiresTrackPlayingMiddleware } from '../middleware.ts';

export const skipHybridChatCommand = {
    classic: {
        aliases: ['skip', 'fs', 's'],
        helpTitle: `${ICONS.CMD.SKIP} Skip`,
    },
    slash: {
        name: 'skip',
        description: 'Skips the current track',
    },
    contexts: {
        guild: true,
    },
    handler: requiresTrackPlayingMiddleware(async (ctx, session) => {
        session.skipCurrentTrack();

        await ctx.upsertReply({
            content: `${ICONS.SUCCESS} **Skipped!**`,
        });
    }),
} satisfies HybridChatCommand;
