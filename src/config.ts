import { config } from "dotenv"
import { readFileSync } from 'fs'
import Logger from "./Logger"
const dotenvConfigResult = config()

if (dotenvConfigResult.error) {
    Logger.debug(`Failed to load .env file: ${dotenvConfigResult.error}`)
} else {
    const parsedKeys = Object.keys(dotenvConfigResult.parsed!)
    Logger.debug(`Parsed [${parsedKeys}] from .env file`)
}

const DEFAULT_PREFIX = '$'

if (!process.env.DISCORD_TOKEN) {
    Logger.err('Discord Token not provided, shutting down')
    process.exit(1)
}

if (!process.env.PREFIX) {
    Logger.info(`Command prefix not provided, defaulting to ${DEFAULT_PREFIX}`)
}

const getCommitId = (): string | undefined => {
    try {
        const head = readFileSync('./.git/HEAD').toString().trim()
        if (head.includes(':')) {
            return readFileSync(`./.git/${head.substring(5)}`).toString().trim()
        }
        return head
    } catch (e) {
        return
    }
}



export const PREFIX = process.env.PREFIX || DEFAULT_PREFIX
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const COMMIT_ID = getCommitId()