import { Snowflake } from "discord.js"
import { REST } from '@discordjs/rest'
import { Routes } from "discord-api-types/v9"
import { Command, commands } from "../commands"

interface SlashCommand {
    name: string,
    description: string,
    options: {
        name: string,
        description: string,
        type: number,
        required: boolean
    }[] | undefined
}

export const slashify = (cmd: Command): SlashCommand => {
    return {
        name: cmd.aliases[0],
        description: cmd.description,
        options: cmd.options
    }
}

const slashCommands = commands.filter((cmd)=>!cmd.secret).map(slashify)

export const registerCommands = async (clientId: Snowflake, token: string): Promise<void> => {
    const rest = new REST({
        version: '9'
    }).setToken(token)
    /*
    const DEV_GUILD_ID = '702087231380389889'   // TMP
    await rest.put(Routes.applicationGuildCommands(clientId, DEV_GUILD_ID), {body: commands})
    */
    await rest.put(Routes.applicationCommands(clientId), {body: slashCommands})
}