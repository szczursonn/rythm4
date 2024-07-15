import { Command } from './index.js';
import { requiresActiveSession } from './middleware.js';

const disconnect: Command = {
    name: 'Disconnect',
    aliases: ['disconnect', 'dc', 'fuckoff'],
    description: 'Disconnect the bot from a voice channel',
    icon: '🛑',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession((ctx, session) => {
        session.destroy();
        return ctx.reply({
            text: '***:beginner: :beginner: :beginner:Thanks for using pompa bocik  :100: :100: :100:***',
        });
    }),
};

export default disconnect;
