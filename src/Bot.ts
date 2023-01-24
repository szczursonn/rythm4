import { Client, ActivityType } from "discord.js"
import { AppConfig } from "./AppConfig"
import { CommandStore } from "./CommandStore"
import Logger from "./Logger"
import { RequestHandler } from "./RequestHandler"
import { SessionStore } from "./SessionStore"

export class Bot {
    private client: Client
    private sessionStore: SessionStore
    private requestHandler: RequestHandler
    private config: AppConfig

    public constructor(config: AppConfig) {
        this.client = new Client({
            intents: ['GuildVoiceStates', 'Guilds', 'GuildMessages', 'MessageContent']
        })
        this.config = config
        this.sessionStore = new SessionStore()
        const commandStore = new CommandStore(this.sessionStore)
        this.requestHandler = new RequestHandler(this.sessionStore, commandStore, this.config)

        this.client.login(this.config.discordToken).catch(this.handleLoginError.bind(this))
        this.client.once('ready', this.handleReady.bind(this))
    }

    private handleReady(client: Client) {
        Logger.info(`Logged in as ${this.client.user!.tag}, command prefix: ${this.config.prefix}`)
        
        this.client.on('interactionCreate', this.requestHandler.handleInteractionCreate.bind(this.requestHandler))
        this.client.on('messageCreate', this.requestHandler.handleMessageCreate.bind(this.requestHandler))

        try {
            this.client.user!.setPresence({
                activities: [{
                    name: `${this.config.prefix}help`,
                    type: ActivityType.Competing
                }]
            })
        } catch (e) {
            Logger.err(`Failed to set presence: `)
            Logger.err(e)
        }
    }

    private handleLoginError(err: any) {
        Logger.err('There was an error logging into Discord: ')
        Logger.err(err)
        process.exit(-1)
    }

    public gracefulExit(signal?: NodeJS.Signals) {
        Logger.info(`${signal} - shutting down...`)
        this.sessionStore.killAll()
        try {
            this.client.destroy()
        } catch (err) {}
        // process.exit() is delayed to allow for client to destroy all sessions and self properly
        setTimeout(process.exit, 1000)
    }
}