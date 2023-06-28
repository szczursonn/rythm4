import { EmbedBuilder } from 'discord.js';
import { Command } from '.';
import config from '../config';
import { formatTime } from '../utils';

const status: Command = {
    name: 'Status',
    aliases: ['status'],
    description: 'Bot status',
    icon: 'ℹ',
    visibility: 'public',
    interactionArguments: [],
    async handler({ bot, reply }) {
        const embed = new EmbedBuilder()
            .setTitle(`Status`)
            .setColor('#eb0c31')
            .addFields(
                {
                    name: 'Uptime',
                    value: `\`${formatTime(Math.floor(process.uptime()))}\``,
                    inline: false,
                },
                {
                    name: 'Active sessions',
                    value: `\`${bot.sessions.count}\``,
                    inline: false,
                },
                {
                    name: 'Enviroment',
                    value: `\`${config.environment}\``,
                    inline: false,
                }
            );

        await reply(embed);
    },
};

export default status;
