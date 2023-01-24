import { GuildMember } from "discord.js"
import { AppConfig } from "../AppConfig"
import { ReplyHandler } from "../ReplyHandler"
import Session from "../Session"

type CommandInteractionArguments = {
    name: string,
    description: string,
    type: number,   // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
    required: boolean
}

export type CommandHandlerParams = {
    session?: Session,
    sender: GuildMember,
    args: string[],
    config: AppConfig,
    replyHandler: ReplyHandler
}

export abstract class Command {
    abstract aliases: string[] // First one gets registered as a slash command and is used as command name in /help
    abstract description: string
    abstract icon: string
    abstract hidden: boolean // hidden in /help and not registered as slash commands
    abstract options?: CommandInteractionArguments[]
    abstract handle(params: CommandHandlerParams): Promise<void>
}