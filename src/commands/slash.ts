import { REST } from '@discordjs/rest';
import { Command, commands } from '.';
import config from '../config';
import { Routes } from 'discord.js';
import logger from '../logger';

const slash: Command = {
    name: 'Slash',
    aliases: ['slash'],
    description: 'Register slash (/) commands on this server',
    icon: '🚀',
    visibility: 'public',
    interactionArguments: [],

    async handler({ sender, reply }) {
        if (!sender.permissions.has('Administrator')) {
            reply('❌ **You need to be an admin to use this command!**');
            return;
        }

        try {
            const slashCommands = commands
                .filter((command) => command.visibility === 'public') // dont register secret commands
                .map((command) => ({
                    name: command.aliases[0],
                    description: command.description,
                    options: command.interactionArguments,
                }));

            const rest = new REST().setToken(config.discordToken);
            await rest.put(
                Routes.applicationGuildCommands(
                    sender.client.user.id,
                    sender.guild.id
                ),
                { body: slashCommands }
            );
            await reply('✅ **Registered slash commands!**');
            logger.debug(
                `Registered slash commands on ${sender.guild.name} (${sender.guild.id})`
            );
        } catch (err) {
            await reply('❌ **There was an error registering slash commands**');
            logger.error(`Failed to register slash commands: ${err}`);
        }
    },
};

export default slash;
