import { Command } from './index.js';
import { requiresTrackPlaying } from './middleware.js';

const skip: Command = {
    name: 'Skip',
    aliases: ['skip', 'fs', 's'],
    description: 'Skip the current song',
    icon: '⏭️',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresTrackPlaying((ctx, session) => {
        session.skipCurrentTrack();
        return ctx.reply({
            text: ':fast_forward: ***Song skipped!***',
        });
    }),
};

export default skip;
