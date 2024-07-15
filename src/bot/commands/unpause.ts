import { Command, ICONS } from './index.js';
import { requiresTrackPlaying } from './middleware.js';

const unpause: Command = {
    name: 'Unpause',
    aliases: ['unpause', 'resume'],
    description: 'Resumes playback',
    icon: '⏯️',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresTrackPlaying((ctx, session) => {
        if (!session.paused) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **I am not paused!**`,
                ephemeral: true,
            });
        }

        session.paused = false;
        return ctx.reply({
            text: ':pause_button: **Player unpaused!**',
        });
    }),
};

export default unpause;
