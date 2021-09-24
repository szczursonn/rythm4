require('dotenv').config()
import { Client, CommandInteraction, GuildMember, Intents, MessageOptions } from "discord.js";
import Session from "./Session";
import { clearHandler, disconnectHandler, helpHandler, loopHandler, pauseHandler, playHandler, queueHandler, shuffleHandler, skipHandler, statusHandler, unpauseHandler, volumeHandler } from "./commandHandlers";
import { registerCommands } from "./utils";

const noop = () => {}

const client = new Client({
    intents: [Intents.FLAGS.GUILD_VOICE_STATES, Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES]
})
const TOKEN = process.env.DISCORD_TOKEN
const PREFIX = process.env.PREFIX || '%'

console.log(`Starting app, prefix: ${PREFIX}`)

if (!TOKEN) {
    console.log('Token not provided')
    process.exit(-1)
}
client.login(TOKEN)

client.once('ready', async () => {
    console.log(`Logged in as ${client.user!.tag}!`)

    try {
        const clientId = client.user!.id
        await registerCommands(clientId, TOKEN)
    } catch (e) {}

    try {
        client.user!.setPresence({
            activities: [{
                name: `${PREFIX}help`,
                type: 'COMPETING'
            }]
        })
    } catch (e) {}
    
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
    if (!msg.guild || !msg.content || !msg.channel || !msg.guild || !msg.content.startsWith(PREFIX)) return

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

const handleCommand = async (cmd: string, arg: string, sender: GuildMember, reply: (msg: MessageOptions | string)=>any) => {

    const session = Session.sessions.get(sender.guild.id)

    switch (cmd) {
        case 'play':
        case 'p':
            return playHandler(session, sender, arg, reply)
        case 'disconnect':
        case 'dc':
        case 'fuckoff':
            return disconnectHandler(session, reply)
        case 'queue':
        case 'q':
            return queueHandler(session, sender.guild.name, reply)
        case 'skip':
        case 'fs':
        case 's':
            return skipHandler(session, reply)
        case 'loop':
            return loopHandler(session, reply)    
        case 'shuffle':
            return shuffleHandler(session, reply)
        case 'volume':
        case 'vol':
            return volumeHandler(session, arg, reply)
        case 'pause':
            return pauseHandler(session, reply)
        case 'unpause':
        case 'resume':
            return unpauseHandler(session, reply)
        case 'help':
            return helpHandler(PREFIX, reply)
        case 'clear':
            return clearHandler(session, reply)
        case 'status':
            return statusHandler(reply)
        case 'wypierdalaj': // secret command
            const url = 'https://www.youtube.com/watch?v=8QQk_CoHbyQ'
            if (session) {
                await clearHandler(session, noop)
                if (session.currentlyPlaying) await skipHandler(session, noop)
            }
            await playHandler(session, sender, url, noop)
            const ses = Session.sessions.get(sender.guild.id)
            if (!ses?.looping) await loopHandler(ses, noop)
            await reply('🔥 ***BO JESTEŚ KURWA BALAS I CHUJ*** 🔥')
            return
        default:
            return reply(':x: **Invalid command**')
    }
}