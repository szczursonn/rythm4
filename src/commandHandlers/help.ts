import { GuildMember, MessageEmbed, MessageOptions } from "discord.js"
import Session from "../Session"
import { PREFIX } from "../config"
import { commands } from "../commands"

const niceCase = (str: string): string => str[0].toUpperCase() + str.toLowerCase().substr(1)

export const helpHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {

    const embed = new MessageEmbed()
        .setTitle(`List of commands for Rythm4`)
        .setColor('#0189df')
        .setURL('https://github.com/szczursonn/Rythm4')
        .setDescription(`Prefix: **${PREFIX}**`)
        .setFields(commands.filter(cmd=>!cmd.secret).map((cmd)=>{
            return {
                name: `${cmd.emoji} **${niceCase(cmd.aliases[0])}**`,
                value: `**${cmd.aliases.map(alias=>PREFIX+alias).join('** or **')}**`,
                inline: true
            }
        }))

    await reply({embeds: [embed]})
    return
}