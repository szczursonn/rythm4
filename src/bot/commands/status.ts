import { EmbedBuilder } from 'discord.js';
import { uptime } from 'node:process';
import { Command } from './index.js';
import { formatTime } from '../../utils.js';

const status: Command = {
    name: 'Status',
    aliases: ['status'],
    description: 'Show bot status',
    icon: 'ℹ',
    visibility: 'public',
    interactionArguments: [],
    async handler(ctx) {
        const embedBuilder = new EmbedBuilder()
            .setTitle(`Status`)
            .setColor('#eb0c31')
            .addFields(
                {
                    name: 'Uptime',
                    value: `\`${formatTime(Math.floor(uptime()))}\``,
                    inline: false,
                },
                {
                    name: 'Active sessions',
                    value: `\`${ctx.bot.sessionCount}\``,
                    inline: false,
                }
            );

        return ctx.reply({
            embeds: [embedBuilder.data],
        });
    },
};

export default status;
