import { Command } from '.';
import { requiresActiveSession } from './middleware';

const clear: Command = {
    name: 'Clear',
    aliases: ['clear', 'cls'],
    description: 'Clear the queue',
    icon: '🧹',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        if (session.queue.length < 1) {
            await reply(':x: **The queue is already empty!**');
            return;
        }

        session.clearQueue();
        await reply(':broom: **Queue cleared!**');
    }),
};

export default clear;
