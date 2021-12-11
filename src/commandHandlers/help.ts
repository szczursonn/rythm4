import { MessageEmbed } from "discord.js"
import { PREFIX } from "../config"
import { CommandHandler, commands } from "../commands"
import { niceCase } from "../utils"

export const helpHandler: CommandHandler = async ({replyCb}) => {

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

    await replyCb({embeds: [embed]})
    return
}