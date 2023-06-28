import { CommandHandler } from '.';

type CommandHandlerMiddleware = (handler: CommandHandler) => CommandHandler;

export const requiresActiveSession: CommandHandlerMiddleware =
    (handler) => async (args) => {
        const session = args.bot.sessions.get(args.sender.guild.id);

        if (!session) {
            await args.reply(':x: **I am not active on this server**');
            return;
        }

        await handler(args);
    };

export const requiresTrackPlaying: CommandHandlerMiddleware = (handler) =>
    requiresActiveSession(async (args) => {
        const session = args.bot.sessions.get(args.sender.guild.id)!;

        if (!session.currentTrack) {
            await args.reply(':x: **Nothing is playing!**');
            return;
        }
        await handler(args);
    });
