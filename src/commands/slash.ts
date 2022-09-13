import { Command, registerSlashCommands } from ".";
import { DISCORD_TOKEN } from "../config";
import Logger from "../Logger";

const slash: Command = {
    aliases: ['slash'],
    description: 'Register slash (/) commands on this server',
    emoji: '🚀',
    secret: false,
    handler: async ({sender, replyCb}) => {

        if (!sender.permissions.has('Administrator')) {
            replyCb('❌ **You need to be an admin to use this command!**')
            return
        }

        try {
            await registerSlashCommands(sender.client.user!.id, sender.guild.id, DISCORD_TOKEN)
            await replyCb('✅ **Registered slash commands!**')
            Logger.debug(`Registered slash commands on ${sender.guild.name} (${sender.guild.id})`)
        } catch (err) {
            await replyCb('❌ **Error when registering slash commands**')
            Logger.err(`Failed to register slash commands: ${err}`)
        }
        
    }
}

export default slash