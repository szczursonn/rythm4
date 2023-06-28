import { Command } from '.';
import { requiresActiveSession } from './middleware';

const loop: Command = {
    name: 'Loop',
    aliases: ['loop'],
    description: 'Toogle looping current song',
    icon: '🔄',
    visibility: 'public',
    interactionArguments: [],
    handler: requiresActiveSession(async ({ bot, sender, reply }) => {
        const session = bot.sessions.get(sender.guild.id)!;

        session.looping = !session.looping;

        await reply(
            `**${
                session.looping
                    ? ':green_circle: Looping on'
                    : ':red_circle: Looping off'
            }!**`
        );
    }),
};

export default loop;
