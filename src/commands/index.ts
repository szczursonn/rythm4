import { GuildMember, MessageOptions } from "discord.js";
import { PREFIX } from "../config";
import Logger from "../Logger";
import Session from "../Session";
import play from "./play";
import disconnect from "./disconnect";
import queue from "./queue";
import skip from "./skip";
import loop from "./loop";
import shuffle from "./shuffle";
import pause from "./pause";
import unpause from "./unpause";
import help from "./help";
import clear from "./clear";
import status from "./status";

export type Command = {
    aliases: string[],    // First one in array gets registered as a slash command and is used as command name in /help
    description: string,
    emoji: string,
    secret: boolean,    // Secret commands are not included in /help and not registered as slash commands
    options?: {
        name: string,
        description: string,
        type: number,   // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
        required: boolean
    }[],
    handler: CommandHandler
}

export type CommandHandler = (commandHandlerParams: CommandHandlerParams)=>Promise<void>

export type CommandHandlerParams = {
    session?: Session,
    sender: GuildMember,
    args: string[],
    replyCb: CommandReplyCb
}

export type CommandReplyCb = (msg: MessageOptions | string)=>Promise<void>

export const handleCommand = async (cmdName: string, commandHandlerParams: CommandHandlerParams): Promise<void> => {
    Logger.debug(`Handling Command: ${commandHandlerParams.sender.user.username} , ${PREFIX}${cmdName} , [${commandHandlerParams.args}]`)

    const command = commandMap.get(cmdName)
    if (!command) {
        commandHandlerParams.replyCb(`:x: **Invalid command**`)
        return
    }
    try {
        await command.handler(commandHandlerParams)
    } catch (err) {
        Logger.err(`Command handler failed: ${err}`)
        commandHandlerParams.replyCb(`🚩 **Failed to handle the command**`)
    }
    
    return
}

export const commands: Command[] = [
    play,
    disconnect,
    queue,
    skip,
    loop,
    shuffle,
    pause,
    unpause,
    help,
    clear,
    status
]

const commandMap = new Map<string, Command>()
for (const command of commands) {
    for (const alias of command.aliases) {
        commandMap.set(alias, command)
    }
}