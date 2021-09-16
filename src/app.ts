require('dotenv').config()
import { Client, CommandInteraction, Guild, GuildMember, Intents, MessageOptions } from "discord.js";
import { sessions } from "./Session";
import { disconnectHandler, helpHandler, loopHandler, pauseHandler, playHandler, queueHandler, shuffleHandler, skipHandler, unpauseHandler, volumeHandler } from "./commandHandlers";
import { registerCommands } from "./utils";

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

client.once('ready', async () => {
    console.log(`Logged in as ${client.user!.tag}!`)

    const clientId = client.user!.id
    await registerCommands(clientId, TOKEN)

    try {
        await client.user!.setPresence({
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

    const session = sessions.get(interaction.guildId)

    await interaction.deferReply()
    const reply = (msg: string | MessageOptions) => {
        interaction.followUp(msg)
    }

    switch (interaction.commandName) {
        case 'play':
            const arg = interaction.options.get('song')?.value
            if (typeof arg !== 'string') {
                return
            }
            await playHandler(session, member, arg, reply)
            break
        case 'disconnect':
            disconnectHandler(session, reply)
            break
        case 'queue':
            queueHandler(session, member.guild.name, reply)
            break
        case 'skip':
            skipHandler(session, reply)
            break
        case 'loop':
            loopHandler(session, reply)    
            break
        case 'shuffle':
            shuffleHandler(session, reply)
            break
        case 'volume':
            const volume = interaction.options.get('volume')?.value
            if (typeof volume !== 'number') {
                return
            }
            volumeHandler(session, volume, reply)
            break
        case 'pause':
            pauseHandler(session, reply)
            break
        case 'unpause':
            unpauseHandler(session, reply)
            break
        case 'help':
            helpHandler(PREFIX, reply)
            break
        default:
            await interaction.reply(':x: **Invalid command**')
            break
    }

})

client.on('messageCreate', async (msg) => {
    if (!msg.guild || !msg.content || !msg.channel || !msg.guild || !msg.content.startsWith(PREFIX) || msg.content === PREFIX) return

    const guild = msg.guild as Guild
    const channel = msg.channel
    const member = msg.member as GuildMember

    let tmp = msg.content.substr(PREFIX.length).split(' ')
    const cmd = tmp.shift()?.toLowerCase()
    const arg = tmp.join(' ')

    const session = sessions.get(guild.id)

    const reply = async (msg: string | MessageOptions) => {
        await channel.send(msg)
    }

    switch (cmd) {
        case 'play':
        case 'p':
            await playHandler(session, member, arg, reply)
            break
        case 'disconnect':
        case 'dc':
        case 'fuckoff':
            disconnectHandler(session, reply)
            break
        case 'queue':
        case 'q':
            queueHandler(session, guild.name, reply)
            break
        case 'skip':
        case 's':
            skipHandler(session, reply)
            break
        case 'loop':
            loopHandler(session, reply)    
            break
        case 'shuffle':
            shuffleHandler(session, reply)
            break
        case 'volume':
        case 'vol':
        case 'v':
            const volume = parseFloat(arg)
            volumeHandler(session, volume, reply)
            break
        case 'pause':
            pauseHandler(session, reply)
            break
        case 'unpause':
        case 'resume':
            unpauseHandler(session, reply)
            break
        case 'help':
            helpHandler(PREFIX, reply)
            break
        default:
            await reply(':x: **Invalid command**')
            break
    }
})

client.login(TOKEN)