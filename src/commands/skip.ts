import { Command } from '.';
import { requiresTrackPlaying } from './middleware';

const skip: Command = {
    name: 'Skip',
    aliases: ['skip', 'fs', 's'],
    description: 'Skip the current song',
    icon: '⏭️',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresTrackPlaying(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        if (!session.currentTrack) {
            reply(':x: **There is nothing to skip!**');
            return;
        }

        session.skipSong();
        await reply(':fast_forward: ***Song skipped!***');
    }),
};

export default skip;
