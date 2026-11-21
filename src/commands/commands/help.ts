import { EmbedBuilder } from 'discord.js';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { ClassicCommandRouter } from '../sources/classic/router.ts';

export const createHelpCommand = ({ classicCommandRouter }: { classicCommandRouter: ClassicCommandRouter }) =>
    ({
        handler: {
            handle: (ctx) =>
                ctx.upsertReply({
                    embeds: [
                        new EmbedBuilder()
                            .setTitle('List of commands for Rythm4')
                            .setColor('#0189df')
                            .setURL('https://github.com/szczursonn/rythm4')
                            .setFields(
                                classicCommandRouter.commands.flatMap((command) => {
                                    if (!command.help) {
                                        return [];
                                    }

                                    return [
                                        {
                                            name: `${command.help.icon} ${command.help.title}`,
                                            value: `**${command.aliases.map((alias) => classicCommandRouter.getPrefix(ctx.client) + alias).join('** or **')}**`,
                                            inline: true,
                                        },
                                    ];
                                }),
                            )
                            .toJSON(),
                    ],
                }),
        },
        aliases: ['help'],
    }) satisfies ClassicCommand;
