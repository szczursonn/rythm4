import { Command } from '.';
import { requiresTrackPlaying } from './middleware';

const unpause: Command = {
    name: 'Unpause',
    aliases: ['unpause', 'resume'],
    description: 'Resume playback',
    icon: '⏯️',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresTrackPlaying(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        if (!session.paused) {
            await reply(':x: **I am not paused!**');
            return;
        }

        session.paused = false;
        await reply(':pause_button: **Player unpaused!**');
        return;
    }),
};

export default unpause;
