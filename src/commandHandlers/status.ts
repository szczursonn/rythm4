import { MessageEmbed, MessageOptions } from "discord.js"
import { freemem, totalmem, loadavg } from 'os'
import Session from "../Session"
import { formatSongDuration } from "../utils"

export const statusHandler = async (reply: (msg: MessageOptions | string)=>any) => {

    const sessionAmount = Session.sessions.size

    const bytesToMb = (b: number): number => Math.floor(b/1024/1024)

    const embed = new MessageEmbed()
            .setTitle(`Status`)
            .setColor('#eb0c31')
                .setDescription(`Active on \`${sessionAmount}\` servers`)
                .addFields(
                    { name: 'Free memory / Total memory', value: `\`${bytesToMb(freemem())} MB / ${bytesToMb(totalmem())} MB\``, inline: false },
                    { name: 'os.loadavg()', value: `\`${loadavg()}\``, inline: false },
                    { name: 'Node.js version', value: `\`${process.version}\``, inline: false },
                    { name: 'Uptime since last restart', value: `\`${formatSongDuration(Math.floor(process.uptime()))}\``, inline: false },
                )

    await reply({embeds: [embed]})
    return
}