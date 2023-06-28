import { Command } from '.';
import { requiresActiveSession } from './middleware';

const disconnect: Command = {
    name: 'Disconnect',
    aliases: ['disconnect', 'dc', 'fuckoff'],
    description: 'Disconnect the bot from a voice channel',
    icon: '🛑',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        await reply(
            '***:beginner: :beginner: :beginner:Thanks for using pompa bocik  :100: :100: :100:***'
        );
        session.destroy();
    }),
};

export default disconnect;
