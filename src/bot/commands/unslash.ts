import { type Command } from './index.js';

const unslash: Command = {
    name: 'Unslash',
    aliases: ['unslash'],
    description: 'Unregisters all slash (/) commands on this server',
    icon: '📴',
    visibility: 'public',
    interactionArguments: [],
    async handler(ctx) {
        await ctx.bot.unregisterSlashCommands(ctx.guild.id);
        await ctx.reply({
            text: '✅ **Unregistered slash commands!**',
        });
    },
};

export default unslash;
