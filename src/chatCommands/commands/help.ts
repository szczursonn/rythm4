import { EmbedBuilder } from 'discord.js';
import type { HybridChatCommand } from '../index.ts';
import { ICONS } from '../../icons.ts';

export const helpHybridChatCommand = {
    classic: {
        aliases: ['help'],
        helpTitle: `${ICONS.CMD.HELP} Help`,
    },
    contexts: {
        dm: true,
        guild: true,
    },
    handler: async (ctx) => {
        const embedBuilder = new EmbedBuilder()
            .setTitle('List of commands for Rythm4')
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/rythm4')
            .setFields(
                ctx.bot.hybridChatCommandManager.commands
                    .filter(
                        (chatCommand) =>
                            (ctx.guildId === null ? chatCommand.contexts.dm : chatCommand.contexts.guild) &&
                            chatCommand.classic
                    )
                    .map((chatCommand) => ({
                        name: chatCommand.classic!.helpTitle,
                        value: `**${chatCommand
                            .classic!.aliases.map(
                                (alias) => ctx.bot.hybridChatCommandManager.classicCommandPrefix + alias
                            )
                            .join('** or **')}**`,
                        inline: true,
                    }))
            );

        await ctx.upsertReply({
            embeds: [embedBuilder.toJSON()],
        });
    },
} satisfies HybridChatCommand;
