import { EmbedBuilder, GuildMember, Snowflake } from "discord.js";
import { REST } from '@discordjs/rest'
import { Routes } from "discord-api-types/v10"
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
import slash from "./slash";
import unslash from "./unslash";

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

export type SlashCommand = {
    name: string,
    description: string,
    options: {
        name: string,
        description: string,
        type: number,
        required: boolean
    }[] | undefined
}

export type CommandHandler = (commandHandlerParams: CommandHandlerParams)=>Promise<void>

export type CommandHandlerParams = {
    session?: Session,
    sender: GuildMember,
    args: string[],
    replyCb: CommandReplyCb
}

export type CommandReplyCb = (msg: string | EmbedBuilder)=>Promise<void>

export const handleCommand = async (cmdName: string, commandHandlerParams: CommandHandlerParams): Promise<void> => {
    Logger.debug(`Handling Command: "${PREFIX}${cmdName} ${commandHandlerParams.args.join(' ')}", ${commandHandlerParams.sender.user.username}@${commandHandlerParams.sender.guild.name}`)

    const command = commandMap.get(cmdName)
    if (!command) {
        commandHandlerParams.replyCb(`:x: **Invalid command**`)
        return
    }
    try {
        await command.handler(commandHandlerParams)
    } catch (err) {
        Logger.err(`Command handler of ${cmdName} failed: `)
        Logger.err(err)
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
    status,
    slash,
    unslash
]

export const registerSlashCommands = async (clientId: Snowflake, guildId: Snowflake, token: string): Promise<any> => {
    const rest = new REST().setToken(token)
    
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: slashCommands})
}

export const unregisterSlashCommands = async (clientId: Snowflake, guildId: Snowflake, token: string): Promise<any> => {
    const rest = new REST().setToken(token)

    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {body: []})
}

const commandMap = new Map<string, Command>()
for (const command of commands) {
    for (const alias of command.aliases) {
        commandMap.set(alias, command)
    }
}

const slashCommands: SlashCommand[] = commands
    .filter(cmd=>!cmd.secret) // dont register secret commands
    .map(cmd=>({
        name: cmd.aliases[0],
        description: cmd.description,
        options: cmd.options
    }))