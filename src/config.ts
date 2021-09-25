import { config } from "dotenv"
config()

export const PREFIX = process.env.PREFIX || '%'
export const DISCORD_TOKEN = process.env.DISCORD_TOKEN