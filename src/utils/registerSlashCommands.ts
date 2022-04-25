import { Snowflake } from "discord.js"
import { REST } from '@discordjs/rest'
import { Routes } from "discord-api-types/v9"
import { commands } from "../commands"

type SlashCommand = {
    name: string,
    description: string,
    options: {
        name: string,
        description: string,
        type: number,
        required: boolean
    }[] | undefined
}

const slashCommands: SlashCommand[] = commands
    .filter(cmd=>!cmd.secret) // dont register secret commands
    .map(cmd=>({
        name: cmd.aliases[0],
        description: cmd.description,
        options: cmd.options
    }))

export const registerSlashCommands = async (clientId: Snowflake, token: string): Promise<any> => {
    const rest = new REST({
        version: '9'
    }).setToken(token)
    /*
    const DEV_GUILD_ID = '702087231380389889'   // TMP
    await rest.put(Routes.applicationGuildCommands(clientId, DEV_GUILD_ID), {body: commands})
    */
    await rest.put(Routes.applicationCommands(clientId), {body: slashCommands})
}