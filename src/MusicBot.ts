import { ActivityType, Client, Events, GatewayIntentBits, Routes, type Snowflake } from 'discord.js';
import type { Logger } from 'winston';
import { ERROR_LOG_KEY, formatError } from './loggerUtils.ts';
import { HybridChatCommandManager } from './chatCommands/index.ts';
import type { TrackManager } from './tracks/TrackManager.ts';
import { ActivityManager } from './ActivityManager.ts';
import { SessionManager } from './SessionManager.ts';

export type MusicBotActivity = {
    name: string;
    type: ActivityType;
};

export class MusicBot {
    public readonly client: Client;
    public readonly logger: Logger;

    public readonly hybridChatCommandManager: HybridChatCommandManager;
    public readonly activityManager: ActivityManager;
    public readonly sessionManager: SessionManager;
    public readonly trackManager: TrackManager;

    public constructor({
        activities,
        activityRotationInterval,
        messageCommandPrefix,
        trackManager,
        logger,
    }: {
        activities: MusicBotActivity[];
        activityRotationInterval: number;
        messageCommandPrefix: string;
        trackManager: TrackManager;
        logger: Logger;
    }) {
        this.client = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
            ],
        });
        this.logger = logger;

        this.trackManager = trackManager;
        this.hybridChatCommandManager = new HybridChatCommandManager(this, messageCommandPrefix);
        this.activityManager = new ActivityManager(this, activities, activityRotationInterval);
        this.sessionManager = new SessionManager(this);
        this.trackManager = trackManager;

        this.client.on(Events.Warn, (msg) => {
            this.logger.warn('discord.js warning', {
                msg,
            });
        });
        this.client.on(Events.Error, (err) => {
            this.logger.error('discord.js error', {
                [ERROR_LOG_KEY]: err,
            });
        });
    }

    public async start(discordToken: string) {
        const readyPromise = new Promise<void>((resolve, reject) => {
            this.client.once(Events.ClientReady, () => resolve());
            setTimeout(() => reject(new Error('ready event timeout')), 10_000);
        });

        try {
            await Promise.all([this.client.login(discordToken), readyPromise]);

            this.logger.info('Logged into Discord', {
                username: this.client.user!.displayName,
            });

            this.activityManager.startRotation();
            this.activityManager.rotateActivity();
        } catch (err) {
            try {
                await this.stop();
            } catch (_) {}
            throw err;
        }
    }

    public async updateApplicationCommands({
        guildId,
        operation,
    }: {
        guildId?: Snowflake;
        operation: 'register' | 'unregister';
    }) {
        if (this.client.user === null) {
            throw new Error('user is null');
        }
        const route = guildId
            ? Routes.applicationGuildCommands(this.client.user.id, guildId)
            : Routes.applicationCommands(this.client.user.id);
        const body = operation === 'register' ? this.hybridChatCommandManager.getSlashMetadata() : [];
        await this.client.rest.put(route, {
            body,
        });
        this.logger.debug('Updated slash commands', {
            guildId,
            operation,
        });
    }

    public async stop() {
        this.logger.info('Shutting down music bot...');
        this.activityManager.stopRotation();
        this.sessionManager.destroyAll('shutdown');

        try {
            await this.client.destroy();
            this.logger.info('Music bot has shut down');
        } catch (err) {
            this.logger.error('Failed to destroy Discord client', {
                [ERROR_LOG_KEY]: formatError(err),
            });
        }
    }
}
