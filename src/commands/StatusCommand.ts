import { EmbedBuilder } from "discord.js";
import { Command, CommandHandlerParams } from ".";
import { SessionStore } from "../SessionStore";
import { formatSongDuration } from "../utils";

export class StatusCommand extends Command {
    aliases = ['status']
    description = 'Bot status'
    icon = 'ℹ'
    hidden = false
    options = undefined

    public constructor(private sessionStore: SessionStore) {
        super()
    }
    
    public async handle({replyHandler, config}: CommandHandlerParams): Promise<void> {
        const sessionAmount = this.sessionStore.count()
    
        const embed = new EmbedBuilder()
                .setTitle(`Status`)
                .setColor('#eb0c31')
                    .addFields(
                        { name: 'Uptime', value: `\`${formatSongDuration(Math.floor(process.uptime()))}\``, inline: false },
                        { name: 'Active sessions', value: `\`${sessionAmount}\``, inline: false },
                        { name: 'Enviroment', value: `\`${config.nodeEnv}\``, inline: false}
                    )
                    .setFooter({text: config.gitHash ? `Git commit ID: ${config.gitHash}` : 'Git commit ID not found'})
    
        await replyHandler.reply(embed)
    }
}