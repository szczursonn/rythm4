import { type Command } from './index.js';

const slash: Command = {
    name: 'Slash',
    aliases: ['slash'],
    description: 'Registers slash (/) commands on this server',
    icon: '🚀',
    visibility: 'public',
    interactionArguments: [],
    async handler(ctx) {
        await ctx.bot.registerSlashCommands(ctx.guild.id);
        await ctx.reply({
            text: '✅ **Registered slash commands!**',
        });
    },
};

export default slash;
