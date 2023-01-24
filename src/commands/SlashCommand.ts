import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { Command, CommandHandlerParams } from ".";
import { CommandStore } from "../CommandStore";
import Logger from "../Logger";

export class SlashCommand extends Command {
    aliases = ['slash']
    description = 'Register slash (/) commands on this server'
    icon = '🚀'
    hidden = false
    options = undefined

    public constructor(private commandStore: CommandStore) {
        super()
    }

    public async handle({sender, replyHandler, config}: CommandHandlerParams): Promise<void> {
        if (!sender.permissions.has('Administrator')) {
            replyHandler.reply('❌ **You need to be an admin to use this command!**')
            return
        }

        try {
            const slashCommands = this.commandStore.getCommands()
                .filter(cmd=>!cmd.hidden) // dont register secret commands
                .map(cmd=>({
                    name: cmd.aliases[0],
                    description: cmd.description,
                    options: cmd.options
                }))
            const rest = new REST().setToken(config.discordToken)
            await rest.put(Routes.applicationGuildCommands(sender.client.user.id, sender.guild.id), {body: slashCommands})
            await replyHandler.reply('✅ **Registered slash commands!**')
            Logger.debug(`Registered slash commands on ${sender.guild.name} (${sender.guild.id})`)
        } catch (err) {
            await replyHandler.reply('❌ **Error when registering slash commands**')
            Logger.err(`Failed to register slash commands: ${err}`)
        }
    }

}