import Session from '../Session.js';
import { CommandHandlerContext, ICONS } from './index.js';

export const requiresActiveSession =
    (handler: (ctx: CommandHandlerContext, session: Session) => Promise<void>) => (ctx: CommandHandlerContext) => {
        const session = ctx.bot.getSession(ctx.guild.id);
        if (!session) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **I am not active on this server**`,
                ephemeral: true,
            });
        }

        return handler(ctx, session);
    };

export const requiresTrackPlaying = (handler: (ctx: CommandHandlerContext, session: Session) => Promise<void>) =>
    requiresActiveSession((ctx, session) => {
        if (session.currentTrack === null) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **Nothing is playing!**`,
                ephemeral: true,
            });
        }
        return handler(ctx, session);
    });
