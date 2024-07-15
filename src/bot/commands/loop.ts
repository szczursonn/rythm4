import { Command } from './index.js';
import { requiresActiveSession } from './middleware.js';

const loop: Command = {
    name: 'Loop',
    aliases: ['loop'],
    description: 'Toogle looping current song',
    icon: '🔄',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession((ctx, session) => {
        session.looping = !session.looping;

        return ctx.reply({
            text: session.looping ? ':green_circle: **Looping on!**' : ':red_circle: **Looping off!**',
        });
    }),
};

export default loop;
