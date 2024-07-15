import { Command, ICONS } from './index.js';
import { requiresActiveSession } from './middleware.js';

const clear: Command = {
    name: 'Clear',
    aliases: ['clear', 'cls'],
    description: 'Clears the queue',
    icon: '🧹',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession((ctx, session) => {
        if (session.queue.length < 1) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **The queue is already empty!**`,
                ephemeral: true,
            });
        }

        session.queue = [];
        return ctx.reply({
            text: ':broom: **Queue cleared!**',
        });
    }),
};

export default clear;
