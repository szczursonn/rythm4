import { EmbedBuilder } from 'discord.js';
import { Command, CommandHandlerMessageContext, commands } from './index.js';

const help: Command = {
    name: 'Help',
    aliases: ['help'],
    description: 'Shows list of supported commands',
    icon: '❓',
    visibility: 'public',
    interactionArguments: [],
    handler(ctx) {
        const embedBuilder = new EmbedBuilder()
            .setTitle('List of commands for Rythm4')
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/rythm4')
            .setFields(
                commands
                    .filter((command) => command.visibility === 'public')
                    .map((command) => ({
                        name: `${command.icon} **${command.name}**`,
                        value:
                            ctx instanceof CommandHandlerMessageContext
                                ? `**${command.aliases.map((alias) => ctx.bot.prefix + alias).join('** or **')}**`
                                : `**/${command.aliases[0]}**`,
                        inline: true,
                    }))
            )
            .setFooter({
                text:
                    ctx instanceof CommandHandlerMessageContext
                        ? `You can also use slash commands (ex. /${help.aliases[0]})`
                        : `You can also use message commands (ex. ${ctx.bot.prefix}${help.aliases[0]})`,
            });

        return ctx.reply({
            embeds: [embedBuilder.data],
        });
    },
};

export default help;
