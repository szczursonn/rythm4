import { PREFIX, DISCORD_TOKEN } from "./config";
import { Client, CommandInteraction, GuildMember, Intents, MessageOptions } from "discord.js";
import Session from "./Session";
import { registerCommands, noop, log, LoggingLabel } from "./utils";
import { resolveCommand } from "./commands";

const client = new Client({
    intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
})

log(`Starting rythm4...`, LoggingLabel.INFO)

client.login(DISCORD_TOKEN)

client.once('ready', async () => {
    log(`Logged in as ${client.user!.tag}, command prefix: ${PREFIX}`, LoggingLabel.INFO)

    try {
        const clientId = client.user!.id
        await registerCommands(clientId, DISCORD_TOKEN!)
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
    if (!(interaction instanceof CommandInteraction) || !interaction.guildId) {
        return
    }

    const member = interaction.member
    if (!(member instanceof GuildMember)) {
        return
    }

    const cmd = interaction.commandName
    const arg = interaction.options.get('song')?.value?.toString() || interaction.options.get('volume')?.value?.toString() || ''

    let reply
    try {
        await interaction.deferReply()
        reply = (msg: string | MessageOptions) => {
            return interaction.followUp(msg).catch(noop)
        }
    } catch (e) {
        reply = noop
    }

    handleCommand(cmd, arg, member, reply)
    return 
})

client.on('messageCreate', async (msg) => {
    if (!msg.guild || !msg.content || !msg.channel || !msg.guild || !msg.content.startsWith(PREFIX) || msg.author.bot) return

    const channel = msg.channel
    const member = msg.member
    if (!member) return

    let tmp = msg.content.substr(PREFIX.length).split(' ')
    const cmd = tmp.shift()?.toLowerCase() || ''
    const arg = tmp.join(' ')

    const reply = async (msg: string | MessageOptions) => {
        return channel.send(msg).catch(noop)
    }

    handleCommand(cmd, arg, member, reply)
    return 
})

const handleCommand = async (cmdName: string, arg: string, sender: GuildMember, reply: (msg: MessageOptions | string)=>any) => {

    const session = Session.sessions.get(sender.guild.id)

    const cmd = resolveCommand(cmdName)
    if (!cmd) {
        await reply(':x: **Invalid command!**')
        return
    }

    try {
        await cmd.handler(session, sender, arg, reply)
    } catch (e) {
        log(`cmd.handler() ERROR: ${e}`, LoggingLabel.ERROR)
        await reply(`🚩 **Failed to handle the command:** \`\`\`${e}\`\`\``)
    }
    return
}

const gracefulExit = () => {
    log('SHUTTING DOWN', LoggingLabel.INFO)
    Array.from(Session.sessions.values()).forEach(session=>session.destroy())
    client.destroy()
    // process.exit() is delayed to allow for client to destroy properly
    setTimeout(process.exit, 1000)
}
process.on('SIGTERM', gracefulExit)
process.on('SIGINT', gracefulExit)