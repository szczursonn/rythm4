import { AppConfig } from "./AppConfig";
import { Bot } from "./Bot";
import Logger from "./Logger";

Logger.info(`Starting app...`)
const appConfig = new AppConfig()
const bot = new Bot(appConfig)

process.on('SIGTERM', bot.gracefulExit.bind(bot))
process.on('SIGINT', bot.gracefulExit.bind(bot))