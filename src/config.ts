import { config } from "dotenv"
import { execSync } from 'child_process'
config()



try {
    commitId = execSync('git rev-parse HEAD').toString().trim().substr(0, 7)
} catch (e) {}

export const PREFIX = process.env.PREFIX || '%'
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'
export const NODE_ENV = process.env.NODE_ENV || 'development'
export var commitId: string | undefined