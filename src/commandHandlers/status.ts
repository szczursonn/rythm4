import { GuildMember, MessageEmbed, MessageOptions, version } from "discord.js"
import Session from "../Session"
import { formatSongDuration } from "../utils"

export const statusHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {

    const sessionAmount = Session.sessions.size

    const bytesToMb = (b: number): number => Math.floor(b/1024/1024)

    const embed = new MessageEmbed()
            .setTitle(`Status`)
            .setColor('#eb0c31')
                .setDescription(`Active on \`${sessionAmount}\` servers`)
                .addFields(
                    { name: 'Used memory', value: `\`${bytesToMb(process.memoryUsage.rss())} MB\``, inline: false },
                    { name: 'Node.js version', value: `\`${process.version}\``, inline: false },
                    { name: 'Discord.js version', value: `\`${version}\``, inline: false },
                    { name: 'Uptime', value: `\`${formatSongDuration(Math.floor(process.uptime()))}\``, inline: false },
                )

    await reply({embeds: [embed]})
    return
}