import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { Command, CommandHandlerParams } from ".";
import Logger from "../Logger";

export class UnslashCommand extends Command {
    aliases = ['unslash']
    description = 'Unregister all slash (/) commands on this server'
    icon = '📴'
    hidden = false
    options = undefined

    public async handle({sender, replyHandler, config}: CommandHandlerParams): Promise<void> {
        if (!sender.permissions.has('Administrator')) {
            replyHandler.reply('❌ **You need to be an admin to use this command!**')
            return
        }

        try {
            const rest = new REST().setToken(config.discordToken)
            await rest.put(Routes.applicationGuildCommands(sender.client.user.id, sender.guild.id), {body: []})

            await replyHandler.reply('✅ **Unregistered slash commands!**')
            Logger.debug(`Unregistered slash commands on ${sender.guild.name} (${sender.guild.id})`)
        } catch (err) {
            await replyHandler.reply('❌ **Error when unregistering slash commands**')
            Logger.err(`Failed to unregister slash commands: ${err}`)
        }
    }

}