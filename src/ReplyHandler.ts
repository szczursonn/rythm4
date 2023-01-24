import { CacheType, CommandInteraction, EmbedBuilder, TextChannel } from "discord.js";
import Logger from "./Logger";

export abstract class ReplyHandler {
    public abstract reply(message: string | EmbedBuilder): Promise<void>
}

export class MessageReplyHandler extends ReplyHandler {

    public constructor(private channel: TextChannel) {
        super()
    }
    
    public async reply(msg: string | EmbedBuilder): Promise<void> {
        try {
            await this.channel.send(typeof msg === 'string' ? msg : { embeds: [msg] })
        } catch (err) {
            Logger.err(`Failed to send a reply message on guild ${this.channel.guildId}: `)
            Logger.err(err)
        }
    }

}

export class InteractionReplyHandler extends ReplyHandler {
    
    private interaction: CommandInteraction<CacheType>

    private constructor(interaction: CommandInteraction<CacheType>) {
        super()
        this.interaction = interaction
    }

    public static async from(interaction: CommandInteraction<CacheType>) {
        try {
            await interaction.deferReply()
        } catch (err) {
            Logger.err(`Failed to defer reply to interaction on guild ${interaction.guildId}: `)
            Logger.err(err)
            throw err
        }
        return new InteractionReplyHandler(interaction)
    }

    public async reply(msg: string | EmbedBuilder): Promise<void> {
        try {
            await this.interaction.followUp(typeof msg === 'string' ? msg : { embeds: [msg] })
        } catch (err) {
            Logger.err(`Failed to reply to interaction on guild ${this.interaction.guildId}: `)
            Logger.err(err)
        }
    }
}