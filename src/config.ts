import { config } from "dotenv"
config()

export const PREFIX = process.env.PREFIX || '%'
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN
export const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production'