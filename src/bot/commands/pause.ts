import { Command, ICONS } from './index.js';
import { requiresTrackPlaying } from './middleware.js';

const pause: Command = {
    name: 'Pause',
    aliases: ['pause'],
    description: 'Pauses playback',
    icon: '⏸️',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresTrackPlaying((ctx, session) => {
        if (session.paused) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **I am already paused!**`,
                ephemeral: true,
            });
        }

        session.paused = true;

        return ctx.reply({
            text: `:pause_button: **Player paused!**`,
        });
    }),
};

export default pause;
