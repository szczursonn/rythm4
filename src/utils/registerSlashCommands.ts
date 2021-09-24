import { Snowflake } from "discord.js"
import { REST } from '@discordjs/rest'
import { Routes } from "discord-api-types/v9"

const commands = [{
    name: 'play',
    description: 'Adds a requested song to the queue',
    options: [
        {
            name: 'song',
            description: 'Song name or Youtube URL',
            type: 3,
            required: true
        }
    ]
}, {
    name: 'disconnect',
    description: 'Disconnect the bot from a voice channel'
}, {
    name: 'queue',
    description: 'Show song queue'
}, {
    name: 'skip',
    description: 'Skip current song'
}, {
    name: 'loop',
    description: 'Toggle the loop'
}, {
    name: 'shuffle',
    description: 'Shuffles the queue'
}, {
    name: 'pause',
    description: 'Pause playback'
}, {
    name: 'unpause',
    description: 'Unpause playback'
}, {
    name: 'volume',
    description: 'DO NOT USE THIS COMMAND',
    options: [
        {
            name: 'volume',
            description: 'Volume level: 0 = 0% , 1 = 100%',
            type: 10,
            required: true
        }
    ]
}, {
    name: 'help',
    description: 'Show the list of commands'
}, {
    name: 'clear',
    description: 'Clear the queue'
}, {
    name: 'status',
    description: 'Bot status'
}]

export const registerCommands = async (clientId: Snowflake, token: string): Promise<void> => {
    const rest = new REST({
        version: '9'
    }).setToken(token)
    /*
    const DEV_GUILD_ID = '702087231380389889'   // TMP
    await rest.put(Routes.applicationGuildCommands(clientId, DEV_GUILD_ID), {body: commands})
    */
    await rest.put(Routes.applicationCommands(clientId), {body: commands})
    
    console.log('Reloaded slash commands')
}