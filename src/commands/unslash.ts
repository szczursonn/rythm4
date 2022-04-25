import { Command, unregisterSlashCommands } from ".";
import { Permissions } from "discord.js";
import Logger from "../Logger";
import { DISCORD_TOKEN } from "../config";

const unslash: Command = {
    aliases: ['unslash'],
    description: 'Unregister all slash (/) commands on this server',
    emoji: '📴',
    secret: false,
    handler: async ({sender, replyCb}) => {

        if (!sender.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
            replyCb('❌ **You need to be an admin to use this command!**')
            return
        }

        try {
            await unregisterSlashCommands(sender.client.user!.id, sender.guild.id, DISCORD_TOKEN)
            await replyCb('✅ **Unregistered slash commands!**')
            Logger.debug(`Unregistered slash commands on ${sender.guild.name} (${sender.guild.id})`)
        } catch (err) {
            await replyCb('❌ **Error when unregistering slash commands**')
            Logger.err(`Failed to unregister slash commands: ${err}`)
        }

    }
}

export default unslash