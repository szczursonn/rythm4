import { config } from "dotenv"
import { execSync } from 'child_process'
import { log, LoggingLabel } from "./utils"
config()

const DEFAULT_PREFIX = '$'

if (!process.env.DISCORD_TOKEN) {
    log('Discord Token not provded, shutting down', LoggingLabel.ERROR)
    process.exit(1)
}

if (!process.env.PREFIX) {
    log(`Command prefix not provided, defaulting to ${DEFAULT_PREFIX}`, LoggingLabel.INFO)
}

try {
    commitId = execSync('git rev-parse HEAD').toString().trim().substring(0, 7)
} catch (e) {}

export const PREFIX = process.env.PREFIX || DEFAULT_PREFIX
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'
export const NODE_ENV = process.env.NODE_ENV || 'development'
export var commitId: string | undefined