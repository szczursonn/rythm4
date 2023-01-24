import { EmbedBuilder } from "discord.js";
import { Command, CommandHandlerParams } from ".";
import { CommandStore } from "../CommandStore";
import { niceCase } from "../utils";

export class HelpCommand extends Command {
    aliases = ['help']
    description = 'Show a list of commands'
    icon = '❓'
    hidden = false
    options = undefined

    public constructor(private commandStore: CommandStore) {
        super()
    }

    public async handle({ config, replyHandler }: CommandHandlerParams): Promise<void> {

        const commands = this.commandStore.getCommands()

        const embed = new EmbedBuilder()
            .setTitle(`List of commands for rythm4`)
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/rythm4')
            .setDescription(`Prefix: **${config.prefix}**`)
            .setFields(commands.filter(cmd=>!cmd.hidden).map((cmd)=>{
                return {
                    name: `${cmd.icon} **${niceCase(cmd.aliases[0])}**`,
                    value: `**${cmd.aliases.map(alias=>config.prefix+alias).join('** or **')}**`,
                    inline: true
                }
            }))
    
        await replyHandler.reply(embed)
        return
    }

}