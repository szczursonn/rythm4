import dotenv from 'dotenv';
import { readFileSync } from 'fs'
import Logger from './Logger';

export class AppConfig {
    private static DEFAULT_PREFIX = '$'

    public readonly discordToken: string
    public readonly prefix: string
    public readonly ytCookie: string | undefined
    public readonly gitHash: string | undefined
    public readonly nodeEnv: 'development' | 'production'

    public constructor() {
        this.loadDotEnvFile()

        if (process.env.DISCORD_TOKEN === undefined) {
            Logger.err('Discord Token [DISCORD_TOKEN] not provided, shutting down')
            process.exit(-1)
        }
        this.discordToken = process.env.DISCORD_TOKEN

        if (process.env.PREFIX === undefined) {
            Logger.info(`Command prefix [PREFIX] not provided, defaulting to ${AppConfig.DEFAULT_PREFIX}`)
            this.prefix = AppConfig.DEFAULT_PREFIX
        } else {
            this.prefix = process.env.PREFIX
        }
        
        if (process.env.YT_COOKIE === undefined) {
            Logger.info('Youtube cookie [YT_COOKIE] not provided, age restricted videos will not work')
        } else {
            this.ytCookie = process.env.YT_COOKIE
        }

        this.gitHash = this.getGitCommitHash()

        this.nodeEnv = process.env.NODE_ENV === 'production' ? 'production' : 'development'
    }

    private loadDotEnvFile() {
        const dotenvConfigResult = dotenv.config()
        if (dotenvConfigResult.error) {
            Logger.debug(`Failed to load .env file: ${dotenvConfigResult.error}`)
        } else {
            const parsedKeys = Object.keys(dotenvConfigResult.parsed!)
            Logger.debug(`Loaded [${parsedKeys}] from .env file`)
        }
    }

    private getGitCommitHash() {
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
}