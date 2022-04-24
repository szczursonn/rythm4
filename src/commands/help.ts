import { MessageEmbed } from "discord.js"
import { PREFIX } from "../config"
import { Command, commands } from "."
import { niceCase } from "../utils"

const help: Command = {
    aliases: ['help'],
    description: 'Show the list of commands',
    emoji: '❓',
    secret: false,
    handler: async ({replyCb}) => {

        const embed = new MessageEmbed()
            .setTitle(`List of commands for rythm4`)
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/rythm4')
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
}

export default help