import { GuildMember, MessageOptions } from "discord.js";
import { clearHandler, disconnectHandler, helpHandler, loopHandler, pauseHandler, playHandler, queueHandler, shuffleHandler, skipHandler, statusHandler, unpauseHandler } from "./commandHandlers";
import Session from "./Session";
import { log, LoggingLabel } from "./utils";

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

export const resolveCommand = (alias: string): Command | undefined => {
    return commands.filter(cmd=>cmd.aliases.includes(alias))[0]
}

export const handleCommand = async (cmdName: string, commandHandlerParams: CommandHandlerParams): Promise<void> => {
    log(`Handling Command: ${commandHandlerParams.sender.user.username} , ${cmdName} , [${commandHandlerParams.args.length}]`, LoggingLabel.DEBUG)

    const command = resolveCommand(cmdName)
    if (!command) {
        commandHandlerParams.replyCb(`:x: **Invalid command**`)
        return
    }
    try {
        await command.handler(commandHandlerParams)
    } catch (err) {
        log(`Command handler failed: ${err}`, LoggingLabel.ERROR)
        commandHandlerParams.replyCb(`🚩 **Failed to handle the command, contact bot owner**`)
    }
    
    return
}

export const commands: Command[] = [{
    aliases: ['play','p'],
    description: 'Adds a requested song to the queue',
    emoji: '⏯️',
    secret: false,
    options: [{
        name: 'song',
        description: 'Song name or Youtube Video/Playlist URL',
        type: 3,
        required: true
    }],
    handler: playHandler
}, {
    aliases: ['disconnect','dc','fuckoff'],
    description: 'Disconnect the bot from a voice channel',
    emoji: '🛑',
    secret: false,
    handler: disconnectHandler
}, {
    aliases: ['queue','q'],
    description: 'Show the song queue',
    emoji: '📄',
    secret: false,
    handler: queueHandler
}, {
    aliases: ['skip','fs','s'],
    description: 'Skip the current song',
    emoji: '⏭️',
    secret: false,
    handler: skipHandler
}, {
    aliases: ['loop'],
    description: 'Toogle looping current song',
    emoji: '🔄',
    secret: false,
    handler: loopHandler
}, {
    aliases: ['shuffle'],
    description: 'Shuffles the queue',
    emoji: '🌀',
    secret: false,
    handler: shuffleHandler
}, {
    aliases: ['pause'],
    description: 'Pause playback',
    emoji: '⏸️',
    secret: false,
    handler: pauseHandler
}, {
    aliases: ['unpause', 'resume'],
    description: 'Resume playback',
    emoji: '⏯️',
    secret: false,
    handler: unpauseHandler
}, {
    aliases: ['help'],
    description: 'Show the list of commands',
    emoji: '❓',
    secret: false,
    handler: helpHandler
}, {
    aliases: ['clear'],
    description: 'Clear the queue',
    emoji: '🧹',
    secret: false,
    handler: clearHandler
}, {
    aliases: ['status'],
    description: 'Bot status',
    emoji: 'ℹ️',
    secret: false,
    handler: statusHandler
}]
