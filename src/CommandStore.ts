import { Command } from "./commands"
import { ClearCommand } from "./commands/ClearCommand"
import { DisconnectCommand } from "./commands/DisconnectCommand"
import { HelpCommand } from "./commands/HelpCommand"
import { LoopCommand } from "./commands/LoopCommand"
import { PauseCommand } from "./commands/PauseCommand"
import { PlayCommand } from "./commands/PlayCommand"
import { QueueCommand } from "./commands/QueueCommand"
import { ShuffleCommand } from "./commands/ShuffleCommand"
import { SkipCommand } from "./commands/SkipCommand"
import { SlashCommand } from "./commands/SlashCommand"
import { StatusCommand } from "./commands/StatusCommand"
import { UnpauseCommand } from "./commands/UnpauseCommand"
import { UnslashCommand } from "./commands/UnslashCommand"
import { SessionStore } from "./SessionStore"

export class CommandStore {
    private commands: Command[]
    private aliasToCommandMap: Map<string, Command>

    public constructor(sessionStore: SessionStore) {
        this.commands = [
            new ClearCommand(),
            new DisconnectCommand(sessionStore),
            new HelpCommand(this),
            new LoopCommand(),
            new PauseCommand(),
            new PlayCommand(sessionStore),
            new QueueCommand(),
            new ShuffleCommand(),
            new SkipCommand(),
            new SlashCommand(this),
            new StatusCommand(sessionStore),
            new UnpauseCommand(),
            new UnslashCommand()
        ]
        this.aliasToCommandMap = CommandStore.generateAliasToCommandMap(this.commands)
    }

    public resolve(alias: string) {
        return this.aliasToCommandMap.get(alias)
    }

    private static generateAliasToCommandMap(commands: Command[]) {
        const map = new Map<string, Command>()
        for (const command of commands) {
            for (const alias of command.aliases) {
                map.set(alias, command)
            }
        }
        return map
    }

    public getCommands() {
        return this.commands
    }
}