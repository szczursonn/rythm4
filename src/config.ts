import { config } from "dotenv"
import { execSync } from 'child_process'
import { log, LoggingLabel } from "./utils"
const dotenvConfigResult = config()

if (dotenvConfigResult.error) {
    log(`Failed to load .env file: ${dotenvConfigResult.error}`, LoggingLabel.DEBUG)
} else {
    const parsedKeys = Object.values(dotenvConfigResult.parsed!)
    log(`Parsed [${parsedKeys}] from .env file`, LoggingLabel.DEBUG)
}

const DEFAULT_PREFIX = '$'

if (!process.env.DISCORD_TOKEN) {
    log('Discord Token not provded, shutting down', LoggingLabel.ERROR)
    process.exit(1)
}

if (!process.env.PREFIX) {
    log(`Command prefix not provided, defaulting to ${DEFAULT_PREFIX}`, LoggingLabel.WARNING)
}

const getCommitId = (): string | undefined => {
    try {
        return execSync('git rev-parse HEAD').toString().trim().substring(0, 7)
    } catch (e) {
        return ''
    }
}



export const PREFIX = process.env.PREFIX || DEFAULT_PREFIX
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const NODE_ENV = process.env.NODE_ENV || 'development'
export const COMMIT_ID = getCommitId()