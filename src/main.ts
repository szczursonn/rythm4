import type stream from 'node:stream';
import path from 'node:path';
import fsp from 'node:fs/promises';
import events from 'node:events';
import { Client, Events, GatewayIntentBits } from 'discord.js';
import * as z from 'zod';
import { parse as parseToml } from 'smol-toml';
import { ClientType } from 'youtubei.js';
import { LOG_LEVELS, Logger } from './logger/logger.ts';
import { PrettyLoggerTransport } from './logger/pretty.ts';
import { JsonLoggerTransport } from './logger/json.ts';
import { HealthCheckPeriodicRunner } from './healthCheck/periodicRunner.ts';
import { createHealthCheckNotifyAdminChannelResultHandler } from './healthCheck/notifyAdminChannel.ts';
import { SessionManager } from './session/manager.ts';
import { MultiMatchTrackSource } from './media/multiMatch.ts';
import { YoutubeTrackSource } from './media/sources/youtube/source.ts';
import { SoundcloudTrackSource } from './media/sources/soundcloud/source.ts';
import { SpotifyTrackSource } from './media/sources/spotify/source.ts';
import { HealthChecker } from './healthCheck/checker.ts';
import { ClassicCommandRouter } from './commands/sources/classic/router.ts';
import { SlashCommandRouter } from './commands/sources/slash/router.ts';
import { createClearCommands } from './commands/commands/clear.ts';
import { createDisconnectCommands } from './commands/commands/disconnect.ts';
import { createHealthCheckCommand } from './commands/commands/healthcheck.ts';
import { createHelpCommand } from './commands/commands/help.ts';
import { createLoopCommands } from './commands/commands/loop.ts';
import { createPlayCommands } from './commands/commands/play.ts';
import { createQueueCommands } from './commands/commands/queue.ts';
import { createShuffleCommands } from './commands/commands/shuffle.ts';
import { createSkipCommands } from './commands/commands/skip.ts';
import { createSlashCommand } from './commands/commands/slash.ts';
import { createStatusCommand } from './commands/commands/status.ts';
import { CleanupStack } from './utils/cleanupStack.ts';
import { waitForAbort } from './utils/waitForAbort.ts';

const configSchema = z.object({
    logger: z
        .object({
            level: z.enum(LOG_LEVELS).default('info'),
            format: z.enum(['text', 'json']).default('text'),
        })
        .prefault({}),
    clients: z
        .array(
            z.object({
                token: z.string().trim().min(1),
                classic_prefix: z.string().trim().min(1).default('!'),
            }),
        )
        .min(1)
        .superRefine((clients, ctx) => {
            const seen = new Map<string, number>();
            clients.forEach(({ classic_prefix }, index) => {
                const firstIndex = seen.get(classic_prefix);
                if (firstIndex === undefined) {
                    seen.set(classic_prefix, index);
                    return;
                }
                ctx.addIssue({
                    code: 'custom',
                    message: `duplicate classic_prefix "${classic_prefix}" in clients ${firstIndex} and ${index}`,
                    path: [index, 'classic_prefix'],
                });
            });
        }),
    sessions: z
        .object({
            limit: z.int().positive().default(10),
            inactivity_timeout_ms: z
                .int()
                .positive()
                .default(1000 * 60 * 5), // 5m
        })
        .prefault({}),
    admin: z
        .object({
            channel_id: z.string().trim().min(1).optional(),
        })
        .prefault({}),
    health_check: z
        .object({
            queries: z.array(z.string().trim().min(1)).default([]),
            interval_ms: z
                .int()
                .positive()
                .default(1000 * 60 * 60 * 12), // 12h
        })
        .prefault({}),
    youtube: z
        .object({
            client: z.enum(Object.values(ClientType)).default(ClientType.MUSIC),
            cookie: z.string().trim().min(1).optional(),
            player_id: z.string().trim().min(1).optional(),
            po_token: z.boolean().default(true),
            session_max_age_ms: z
                .int()
                .positive()
                .default(1000 * 60 * 60 * 4), // 4h
        })
        .prefault({}),
    soundcloud: z
        .object({
            enabled: z.boolean().default(true),
        })
        .prefault({}),
    spotify: z
        .object({
            enabled: z.boolean().default(true),
        })
        .prefault({}),
});

const main = async ({
    dataDirPath,
    stderr,
    signal,
}: {
    dataDirPath: string;
    stderr: stream.Writable;
    signal: AbortSignal;
}): Promise<'ok' | 'setupError' | 'runtimeError'> => {
    const fatalController = new AbortController();
    const runSignal = AbortSignal.any([signal, fatalController.signal]);

    const configPath = path.resolve(dataDirPath, 'config.toml');
    let config;
    try {
        config = configSchema.parse(
            parseToml(await fsp.readFile(configPath, { encoding: 'utf-8', signal: runSignal })),
        );
    } catch (err) {
        const configErrorLogger = Logger.create({
            transport: new JsonLoggerTransport({ dst: stderr }),
            level: 'info',
        });

        if (err instanceof z.ZodError) {
            configErrorLogger.error('Invalid config', {
                configPath,
                issues: z.prettifyError(err),
            });
        } else {
            configErrorLogger.error('Failed to load config', {
                configPath,
                err,
            });
        }

        return 'setupError';
    }

    const logger = Logger.create({
        transport:
            config.logger.format === 'json'
                ? new JsonLoggerTransport({ dst: stderr })
                : new PrettyLoggerTransport({ dst: stderr }),
        level: config.logger.level,
    });
    logger.debug('Config loaded', {
        configPath,
    });

    const cleanup = new CleanupStack();

    try {
        const discordBaseLogger = logger.withModule('discord');

        const clients = await Promise.all(
            config.clients.map(async ({ token }, clientIndex) => {
                const discordLogger = discordBaseLogger.withAttrs({ clientIndex });

                const client = new Client({
                    intents: [
                        GatewayIntentBits.Guilds,
                        GatewayIntentBits.GuildVoiceStates,
                        GatewayIntentBits.GuildMessages,
                        GatewayIntentBits.MessageContent,
                    ],
                })
                    .on(Events.Warn, (msg) => {
                        discordLogger.warn('discord.js warning', { msg });
                    })
                    .on(Events.Error, (err) => {
                        discordLogger.error('discord.js error', { err });
                    })
                    .on(Events.ShardError, (err, shardId) => {
                        discordLogger.error('Shard error', { err, shardId });
                    })
                    .on(Events.ShardReady, (shardId) => {
                        discordLogger.info('Shard ready', { shardId });
                    })
                    .on(Events.ShardReconnecting, (shardId) => {
                        discordLogger.info('Shard reconnecting...', { shardId });
                    })
                    .on(Events.ShardResume, (shardId, replayedEvents) => {
                        discordLogger.info('Shard resumed', { shardId, replayedEvents });
                    })
                    .on(Events.ShardDisconnect, ({ code }, shardId) => {
                        discordLogger.error('Shard disconnected and is unable to reconnect', {
                            code,
                            shardId,
                        });
                        fatalController.abort();
                    });
                cleanup.register(`discord client ${clientIndex}: destroy`, () => client.destroy());

                discordLogger.info('Logging into Discord...');
                try {
                    await Promise.all([
                        client.login(token).then(() => {
                            discordLogger.debug('Client connected to gateway');
                        }),
                        events.once(client, Events.ClientReady, {
                            signal,
                        }),
                    ]);
                } catch (err) {
                    throw new Error(`Client ${clientIndex} failed to log in`, { cause: err });
                }

                if (!client.isReady()) {
                    throw new Error('client not ready after ready event');
                }

                discordLogger.info('Logged into Discord!', {
                    user: {
                        id: client.user.id,
                        name: client.user.tag,
                    },
                });

                return client;
            }),
        );

        const sessionManager = new SessionManager({
            logger: logger.withModule('session'),
            limit: config.sessions.limit,
            inactivityTimeoutMs: config.sessions.inactivity_timeout_ms,
        });
        cleanup.register('session manager: destroy', () => {
            sessionManager.destroy();
        });

        const matchSource = new MultiMatchTrackSource();

        const youtubeTrackSource = new YoutubeTrackSource({
            logger: logger.withModule('youtube'),
            clientType: config.youtube.client,
            playerIdOverride: config.youtube.player_id,
            cookie: config.youtube.cookie,
            sessionMaxAgeMs: config.youtube.session_max_age_ms,
            cacheDirPath: path.resolve(dataDirPath, 'innertube-cache'),
            poTokenEnabled: config.youtube.po_token,
        });

        matchSource.add(youtubeTrackSource);

        if (config.soundcloud.enabled) {
            matchSource.add(new SoundcloudTrackSource());
        }
        if (config.spotify.enabled) {
            matchSource.add(new SpotifyTrackSource(youtubeTrackSource));
        }

        const adminChannelId = config.admin.channel_id ?? null;

        const healthCheckLogger = logger.withModule('healthCheck');
        const healthChecker =
            config.health_check.queries.length > 0
                ? new HealthChecker({
                      matchSource,
                      queries: config.health_check.queries,
                      logger: healthCheckLogger,
                  })
                : null;

        const commandsLogger = logger.withModule('commands');
        const classicCommandRouter = new ClassicCommandRouter({
            logger: commandsLogger,
        });
        const slashCommandRouter = new SlashCommandRouter({
            logger: commandsLogger,
        });

        const play = createPlayCommands({
            sessionManager,
            matchSource,
            searchSource: youtubeTrackSource,
            suggestionsSource: youtubeTrackSource,
        });
        const skip = createSkipCommands({ sessionManager });
        const queue = createQueueCommands({ sessionManager });
        const clear = createClearCommands({ sessionManager });
        const disconnect = createDisconnectCommands({ sessionManager });
        const loop = createLoopCommands({ sessionManager });
        const shuffle = createShuffleCommands({ sessionManager, matchSource });

        classicCommandRouter.add(
            play.classic,
            skip.classic,
            queue.classic,
            clear.classic,
            disconnect.classic,
            loop.classic,
            shuffle.classic,
            createHelpCommand({ classicCommandRouter }),
        );
        slashCommandRouter.add(
            play.slash,
            skip.slash,
            queue.slash,
            clear.slash,
            disconnect.slash,
            loop.slash,
            shuffle.slash,
        );

        if (adminChannelId) {
            classicCommandRouter.add(
                createSlashCommand({ adminChannelId, slashCommandRouter }),
                createStatusCommand({ sessionManager, adminChannelId }),
            );

            if (healthChecker) {
                classicCommandRouter.add(createHealthCheckCommand({ healthChecker, adminChannelId }));
            }
        }

        for (let i = 0; i < clients.length; i++) {
            const client = clients[i]!;
            const prefix = config.clients[i]!.classic_prefix;

            classicCommandRouter.addClient(client, { prefix });
            cleanup.register(`discord client ${i}: remove from classic command router`, () => {
                classicCommandRouter.removeClient(client);
            });

            slashCommandRouter.addClient(client);
            cleanup.register(`discord client ${i}: remove from slash command router`, () => {
                slashCommandRouter.removeClient(client);
            });
        }

        if (healthChecker) {
            const notifyingClient = clients[0]!;
            const healthCheckPeriodicRunner = new HealthCheckPeriodicRunner({
                checker: healthChecker,
                intervalMs: config.health_check.interval_ms,
                onResult: adminChannelId
                    ? createHealthCheckNotifyAdminChannelResultHandler({
                          client: notifyingClient,
                          adminChannelId,
                          logger: healthCheckLogger.withModule('notifyAdmin'),
                      })
                    : undefined,
            });
            cleanup.register('health check periodic runner: destroy', () => {
                healthCheckPeriodicRunner.destroy();
            });
        }

        await waitForAbort(runSignal);

        return fatalController.signal.aborted ? 'runtimeError' : 'ok';
    } catch (err) {
        if (runSignal.aborted) {
            logger.debug('Startup interrupted', {
                err,
            });
        } else {
            logger.error('Failed to start', {
                err,
            });
        }

        return 'setupError';
    } finally {
        logger.info('Shutting down...');
        await cleanup.run({
            onError: (step, err) => {
                logger.error('Cleanup step failed', { step, err });
            },
        });
        logger.info('Shut down');
    }
};

export default main;
