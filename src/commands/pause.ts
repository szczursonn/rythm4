import { Command } from '.';
import { requiresTrackPlaying } from './middleware';

const pause: Command = {
    name: 'Pause',
    aliases: ['pause'],
    description: 'Pause playback',
    icon: '⏸️',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresTrackPlaying(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        if (session.paused) {
            await reply(':x: **I am already paused!**');
            return;
        }
        session.paused = true;
        await reply(':pause_button: **Player paused!**');
        return;
    }),
};

export default pause;
