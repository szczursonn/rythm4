import { EmbedBuilder } from "discord.js"
import Session from "../Session"
import { formatSongDuration } from "../utils"
import { COMMIT_ID, NODE_ENV } from "../config"
import { Command } from "."

const status: Command = {
    aliases: ['status'],
    description: 'Bot status',
    emoji: 'ℹ',
    secret: false,
    handler: async ({replyCb}) => {

        const sessionAmount = Session.getAllSessions().length
    
        const embed = new EmbedBuilder()
                .setTitle(`Status`)
                .setColor('#eb0c31')
                    .addFields(
                        { name: 'Uptime', value: `\`${formatSongDuration(Math.floor(process.uptime()))}\``, inline: false },
                        { name: 'Active sessions', value: `\`${sessionAmount}\``, inline: false },
                        { name: 'Enviroment', value: `\`${NODE_ENV}\``, inline: false}
                    )
                    .setFooter({text: COMMIT_ID ? `Git commit ID: ${COMMIT_ID}` : 'Git commit ID not found'})
    
        await replyCb(embed)
        return
    }
}

export default status