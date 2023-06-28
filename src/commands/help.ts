import { EmbedBuilder } from 'discord.js';
import { Command, commands } from '.';
import config from '../config';

const help: Command = {
    name: 'Help',
    aliases: ['help'],
    description: 'Show a list of commands',
    icon: '❓',
    visibility: 'public',
    interactionArguments: [],
    async handler({ reply }) {
        const embed = new EmbedBuilder()
            .setTitle('List of commands for Rythm4')
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/rythm4')
            .setDescription(`Prefix: **${config.prefix}**`)
            .setFields(
                commands
                    .filter((command) => command.visibility === 'public')
                    .map((command) => {
                        return {
                            name: `${command.icon} **${command.name}**`,
                            value: `**${command.aliases
                                .map((alias) => config.prefix + alias)
                                .join('** or **')}**`,
                            inline: true,
                        };
                    })
            );

        await reply(embed);
    },
};

export default help;
