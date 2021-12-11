import { MessageEmbed, version } from "discord.js"
import Session from "../Session"
import { formatSongDuration } from "../utils"
import { commitId, NODE_ENV } from "../config"
import { CommandHandler } from "../commands"

export const statusHandler: CommandHandler = async ({replyCb}) => {

    const sessionAmount = Session.getAllSessions().length

    const bytesToMb = (b: number): number => Math.floor(b/1024/1024)

    const embed = new MessageEmbed()
            .setTitle(`Status`)
            .setColor('#eb0c31')
                .setDescription(`Active on \`${sessionAmount}\` servers\nEnviroment: \`${NODE_ENV}\``)
                .addFields(
                    { name: 'Used memory', value: `\`${bytesToMb(process.memoryUsage.rss())} MB\``, inline: false },
                    { name: 'Node.js version', value: `\`${process.version}\``, inline: false },
                    { name: 'Discord.js version', value: `\`${version}\``, inline: false },
                    { name: 'Uptime', value: `\`${formatSongDuration(Math.floor(process.uptime()))}\``, inline: false },
                )
                .setFooter(commitId ? `Commit ID: ${commitId}` : 'Commit ID not found')

    await replyCb({embeds: [embed]})
    return
}