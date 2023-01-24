import { CacheType, CommandInteraction, GuildMember, Interaction, Message, TextChannel } from "discord.js"
import { AppConfig } from "./AppConfig"
import { CommandHandlerParams } from "./commands"
import { CommandStore } from "./CommandStore"
import Logger from "./Logger"
import { InteractionReplyHandler, MessageReplyHandler, ReplyHandler } from "./ReplyHandler"
import { SessionStore } from "./SessionStore"

export class RequestHandler {
    private sessionStore: SessionStore
    private commandStore: CommandStore
    private config: AppConfig

    public constructor(sessionStore: SessionStore, commandStore: CommandStore, config: AppConfig) {
        this.sessionStore = sessionStore
        this.commandStore = commandStore
        this.config = config
    }

    public async handleInteractionCreate(interaction: Interaction<CacheType>) {
        if (
            !(interaction instanceof CommandInteraction) || 
            !interaction.guildId || 
            !(interaction.member instanceof GuildMember)
        ) return
    
        const cmd = interaction.commandName
        const arg = interaction.options.get('song')?.value?.toString() || interaction.options.get('volume')?.value?.toString() || ''
        
        let replyHandler: ReplyHandler
        try {
            replyHandler = await InteractionReplyHandler.from(interaction)
        } catch (err) {
            return
        }
    
        await this.handleCommand(cmd, {
            session: this.sessionStore.get(interaction.guildId),
            sender: interaction.member,
            args: [arg],
            replyHandler,
            config: this.config
        })
        return
    }

    public async handleMessageCreate(msg: Message) {
        if (
            !msg.guild || 
            !msg.content || 
            !msg.channel || 
            !(msg.channel instanceof TextChannel) ||
            !msg.content.startsWith(this.config.prefix) || 
            msg.author.bot 
            || !msg.member
        ) return

        const args = msg.content.substring(this.config.prefix.length).split(' ')
        const cmd = args.shift()?.toLowerCase() || ''
    
        const replyHandler = new MessageReplyHandler(msg.channel)
    
        await this.handleCommand(cmd, {
            session: this.sessionStore.get(msg.guild.id),
            args,
            sender: msg.member,
            replyHandler,
            config: this.config
        })
        return 
    }

    private async handleCommand(cmd: string, params: CommandHandlerParams) {
        Logger.debug(`Handling Command: "${this.config.prefix}${cmd} ${params.args.join(' ')}", ${params.sender.user.username}#${params.sender.user.discriminator}@${params.sender.guild.name}`)
        
        const command = this.commandStore.resolve(cmd)
        if (!command) {
            params.replyHandler.reply(`:x: **Invalid command**`)
            return
        }

        try {
            await command.handle(params)
        } catch (err) {
            Logger.err(`Failed handling ${cmd}: `)
            Logger.err(err)
            params.replyHandler.reply(`🚩 **Failed to handle the command**`)
        }
    }
}