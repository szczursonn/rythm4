import { REST, Routes } from 'discord.js';
import { Command } from '.';
import config from '../config';
import logger from '../logger';

const unslash: Command = {
    name: 'Unslash',
    aliases: ['unslash'],
    description: 'Unregister all slash (/) commands on this server',
    icon: '📴',
    visibility: 'public',
    interactionArguments: [],
    async handler({ sender, reply }) {
        if (!sender.permissions.has('Administrator')) {
            reply('❌ **You need to be an admin to use this command!**');
            return;
        }

        try {
            const rest = new REST().setToken(config.discordToken);
            await rest.put(
                Routes.applicationGuildCommands(
                    sender.client.user.id,
                    sender.guild.id
                ),
                { body: [] }
            );
            await reply('✅ **Unregistered slash commands!**');
            logger.debug(
                `Registered slash commands on ${sender.guild.name} (${sender.guild.id})`
            );
        } catch (err) {
            await reply(
                '❌ **There was an error unregistering slash commands**'
            );
            logger.error(`Failed to unregister slash commands: ${err}`);
        }
    },
};

export default unslash;
