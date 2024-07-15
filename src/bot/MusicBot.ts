import {
    ActivityType,
    ChannelType,
    Client,
    CommandInteraction,
    Interaction,
    Message,
    Routes,
    Snowflake,
    VoiceChannel,
} from 'discord.js';
import logger from '../logger.js';
import {
    CommandHandlerMessageContext,
    CommandHandlerInteractionContext,
    commands,
    aliasToCommandsMap,
    ICONS,
} from './commands/index.js';
import Session from './Session.js';
import help from './commands/help.js';
import ytdl from '@distube/ytdl-core';

const PRESENCE_REFRESH_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12h

// TODO: something better than disconnect cb, maybe event emitter?
export class MusicBot {
    public readonly prefix;
    public readonly ytdlAgent;

    private client;
    private sessions;

    public constructor({ prefix }: { prefix: string }) {
        this.prefix = prefix;
        this.ytdlAgent = ytdl.createAgent();

        this.client = new Client({
            intents: ['Guilds', 'GuildVoiceStates', 'GuildMessages', 'MessageContent'],
        });
        this.sessions = new Map<Snowflake, Session>();

        this.client.once('ready', () => {
            this.updatePresence();
            const presenceInterval = setInterval(this.updatePresence.bind(this), PRESENCE_REFRESH_INTERVAL_MS);

            this.client.once('disconnect', () => {
                clearInterval(presenceInterval);
            });
        });

        this.client.on('warn', logger.warn);
        this.client.on('error', logger.error);

        this.client.on('messageCreate', this.handleMessage.bind(this));
        this.client.on('interactionCreate', this.handleInteraction.bind(this));
    }

    public async start(token: string) {
        await this.client.login(token);
        logger.info(`Logged in as ${this.client.user!.tag}!`);
    }

    public waitForDisconnect() {
        return new Promise((resolve) => this.client.once('disconnect', resolve));
    }

    public stop() {
        return this.client.destroy();
    }

    public get sessionCount() {
        return this.sessions.size;
    }

    public getSession(guildId: Snowflake) {
        return this.sessions.get(guildId);
    }

    public getOrCreateSession(voiceChannel: VoiceChannel) {
        const existingSession = this.getSession(voiceChannel.guildId);
        if (existingSession) {
            return existingSession;
        }

        const newSession = new Session(this, voiceChannel);
        this.sessions.set(voiceChannel.guildId, newSession);

        return newSession;
    }

    public destroySession(guildId: Snowflake) {
        const session = this.getSession(guildId);
        if (session) {
            this.sessions.delete(guildId);
            session.destroy();
        }
    }

    public registerSlashCommands(guildId: Snowflake) {
        return this.client.rest.put(Routes.applicationGuildCommands(this.client.user!.id, guildId), {
            body: commands
                .filter((command) => command.visibility === 'public') // dont register secret commands
                .map((command) => ({
                    name: command.aliases[0],
                    description: command.description,
                    options: command.interactionArguments,
                    contexts: [0], // guild
                })),
        });
    }

    public unregisterSlashCommands(guildId: Snowflake) {
        return this.client.rest.put(Routes.applicationGuildCommands(this.client.user!.id, guildId), {
            body: [],
        });
    }

    private handleMessage(message: Message) {
        if (
            !message.content.startsWith(this.prefix) ||
            message.author.bot ||
            message.channel.type !== ChannelType.GuildText ||
            !message.member
        ) {
            return;
        }

        // TODO: do not mutate message content
        const commandName = message.content.substring(this.prefix.length).split(' ')[0]!.toLowerCase();
        const args = message.content.substring(commandName.length + this.prefix.length).trim();

        this.handleCommand(commandName, new CommandHandlerMessageContext(this, message as Message<true>, args));
    }

    private handleInteraction(interaction: Interaction) {
        if (!(interaction instanceof CommandInteraction) || !interaction.guild || !interaction.member) {
            return;
        }

        this.handleCommand(
            interaction.commandName,
            new CommandHandlerInteractionContext(this, interaction as CommandHandlerInteractionContext['interaction'])
        );
    }

    private async handleCommand(
        commandName: string,
        ctx: CommandHandlerMessageContext | CommandHandlerInteractionContext
    ) {
        const command = aliasToCommandsMap.get(commandName);
        if (!command) {
            return;
        }

        try {
            logger.debug(`[${ctx.guild.id}] Handling command ${commandName} from ${ctx.user.tag}`);
            await command.handler(ctx);
        } catch (err) {
            logger.error(`[${ctx.guild.id}] ${commandName} Command handler failed:`, err);
            await ctx.reply({
                text: `${ICONS.APP_ERROR} **An unexpected error has occured**`,
                ephemeral: true,
            });
        }
    }

    private updatePresence() {
        if (this.client.user) {
            this.client.user.setPresence({
                activities: [
                    {
                        name: `izakOOO | ${this.prefix}${help.aliases[0]}`,
                        type: ActivityType.Listening,
                    },
                ],
            });
            logger.info('Updated presence');
        }
    }
}
