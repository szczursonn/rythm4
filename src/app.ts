import { PREFIX, DISCORD_TOKEN } from "./config";
import { Client, CommandInteraction, GuildMember, Intents, MessageOptions } from "discord.js";
import Session from "./Session";
import { registerSlashCommands, log, LoggingLabel } from "./utils";
import { CommandReplyCb, handleCommand } from "./commands";

const client = new Client({
    intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
})

log(`Starting rythm4...`, LoggingLabel.INFO)

client.login(DISCORD_TOKEN)

client.once('ready', async () => {
    log(`Logged in as ${client.user!.tag}, command prefix: ${PREFIX}`, LoggingLabel.INFO)

    try {
        const clientId = client.user!.id
        await registerSlashCommands(clientId, DISCORD_TOKEN!)
        log('Registered slash commands', LoggingLabel.INFO)
    } catch (e) {
        log(`Failed to register slash commands: ${e}`, LoggingLabel.ERROR)
    }

    try {
        client.user!.setPresence({
            activities: [{
                name: `${PREFIX}help`,
                type: 'COMPETING'
            }]
        })
    } catch (e) {
        log(`Failed to set presence: ${e}`, LoggingLabel.ERROR)
    }
    
})

client.on('interactionCreate', async (interaction) => {
    if (!(interaction instanceof CommandInteraction) || !interaction.guildId || !(interaction.member instanceof GuildMember) ) {
        return
    }

    const cmd = interaction.commandName
    const arg = interaction.options.get('song')?.value?.toString() || interaction.options.get('volume')?.value?.toString() || ''

    let replyCb: CommandReplyCb = async ()=>{}
        try {
            await interaction.deferReply()
            replyCb = async (msg: string | MessageOptions) => {
                await interaction.followUp(msg).catch((err)=>{
                    log(`Failed to reply to interaction on guild ${interaction.guildId}:\n${err}`, LoggingLabel.ERROR)
                })
                return
            }
        } catch (err) {
            log(`Failed to defer reply to interaction on guild ${interaction.guildId}:\n${err}`, LoggingLabel.ERROR)
        }

    await handleCommand(cmd, {
        session: Session.getSession(interaction.guildId),
        sender: interaction.member,
        args: [arg],
        replyCb
    })
    return 
})

client.on('messageCreate', async (msg) => {
    if (!msg.guild || !msg.content || !msg.channel || !msg.guild || !msg.content.startsWith(PREFIX) || msg.author.bot || !msg.member) return

    const args = msg.content.substring(PREFIX.length).split(' ')
    const cmd = args.shift()?.toLowerCase() || ''

    const replyCb: CommandReplyCb = async (replyMsg: string | MessageOptions) => {
        await msg.channel.send(replyMsg).catch((err)=>{
            log(`Failed to send a reply message on guild ${msg.guildId}:\n${err}`, LoggingLabel.ERROR)
        })
        return
    }

    await handleCommand(cmd, {
        session: Session.getSession(msg.guild.id),
        args,
        sender: msg.member,
        replyCb
    })
    return 
})

const gracefulExit = () => {
    log('SHUTTING DOWN', LoggingLabel.INFO)
    Session.getAllSessions().forEach(session=>session.destroy())
    client.destroy()
    // process.exit() is delayed to allow for client to destroy all sessions and self properly
    setTimeout(process.exit, 1000)
}
process.on('SIGTERM', gracefulExit)
process.on('SIGINT', gracefulExit)