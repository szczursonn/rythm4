import type { HybridChatCommandHandler, HybridChatCommandHandlerContext } from './index.ts';
import type { Session } from '../Session.ts';
import type { Track } from '../tracks/TrackManager.ts';
import { ICONS } from '../icons.ts';

export const requiresSessionMiddleware =
    <TArgs>(
        handler: (ctx: HybridChatCommandHandlerContext<TArgs>, session: Session) => Promise<void>
    ): HybridChatCommandHandler<TArgs> =>
    async (ctx) => {
        if (ctx.guildId === null) {
            throw new Error('no guild');
        }

        const session = ctx.bot.sessionManager.getSession(ctx.guildId);
        if (session === null) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **I am not active on this server**`,
                ephemeral: true,
            });
            return;
        }

        await handler(ctx, session);
    };

export const requiresTrackPlayingMiddleware = <TArgs>(
    handler: (ctx: HybridChatCommandHandlerContext<TArgs>, session: Session, currentTrack: Track) => Promise<void>
): HybridChatCommandHandler<TArgs> =>
    requiresSessionMiddleware(async (ctx, session) => {
        if (session.currentTrack === null) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **I am not playing anything!**`,
                ephemeral: true,
            });
            return;
        }

        await handler(ctx, session, session.currentTrack);
    });

export const requiresAppAdmin =
    <TArgs>(handler: (ctx: HybridChatCommandHandlerContext<TArgs>) => Promise<void>): HybridChatCommandHandler<TArgs> =>
    async (ctx) => {
        if (!ctx.bot.adminIds.includes(ctx.userId)) {
            await ctx.upsertReply({
                content: `${ICONS.USER_ERROR} **You cannot use this command.**`,
                ephemeral: true,
            });
            return;
        }

        await handler(ctx);
    };
