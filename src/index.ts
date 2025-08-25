import { readFile } from 'node:fs/promises';
import { parse as parseToml } from 'toml';
import { z } from 'zod';
import { ActivityType } from 'discord.js';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { ERROR_LOG_KEY, formatError } from './loggerUtils.ts';
import { MusicBot } from './MusicBot.ts';
import { TrackManager } from './tracks/TrackManager.ts';
import { YoutubeTrackProvider } from './tracks/YoutubeTrackProvider.ts';
import { SoundcloudTrackProvider } from './tracks/SoundcloudTrackProvider.ts';
import { SpotifyTrackProvider } from './tracks/SpotifyTrackProvider.ts';

const shutdownManager = (() => {
    const shutdownCallbacks = [] as (() => Promise<void> | void)[];
    let isShuttingDown = false;

    const initShutdown = async () => {
        if (isShuttingDown) {
            return;
        }
        isShuttingDown = true;

        for (const callback of shutdownCallbacks.toReversed()) {
            await callback();
        }

        process.exit();
    };

    process.once('SIGINT', initShutdown);
    process.once('SIGTERM', initShutdown);

    return {
        registerCallback: (callback: (typeof shutdownCallbacks)[number]) => {
            shutdownCallbacks.push(callback);
        },
        initShutdown,
    };
})();

(async () => {
    const configLoadResult = await (async () => {
        try {
            return {
                config: z
                    .object({
                        debug: z.boolean().default(false),
                        youtube_cookie: z.string().min(1).optional(),
                        discord_token: z
                            .string()
                            .transform((val) => val.trim())
                            .pipe(z.string().min(1)),
                        command_prefix: z
                            .string()
                            .optional()
                            .transform((val) => val?.trim() || '!'),
                        activity_update_interval: z.number().positive().default(3_600_000),
                        activities: z
                            .array(
                                z.object({
                                    name: z
                                        .string()
                                        .transform((val) => val.trim())
                                        .pipe(z.string().min(1)),
                                    type: z
                                        .string()
                                        .transform((val) => val.trim().toLowerCase())
                                        .transform((val) => {
                                            for (const activityTypeKey of Object.keys(ActivityType)) {
                                                if (activityTypeKey.toLowerCase() === val) {
                                                    return ActivityType[activityTypeKey as keyof typeof ActivityType];
                                                }
                                            }
                                            throw new Error(`invalid activity type: "${val}"`);
                                        }),
                                })
                            )
                            .default([]),
                    })
                    .parse(parseToml((await readFile('./config.toml')).toString())),
            };
        } catch (err) {
            return {
                error: err,
            };
        }
    })();

    const logger = winston.createLogger({
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.json(),
                    winston.format.colorize({
                        level: true,
                    }),
                    winston.format.timestamp(),
                    winston.format.align(),
                    winston.format.printf(
                        (() => {
                            const keysToIgnore = new Set(['timestamp', 'level', 'message']);

                            return (info) => {
                                const jason = JSON.stringify(
                                    Object.fromEntries(Object.entries(info).filter(([key]) => !keysToIgnore.has(key)))
                                );

                                return `[${info.timestamp}] ${info.level}: ${info.message} ${
                                    jason === '{}' ? '' : jason
                                }`;
                            };
                        })()
                    )
                ),
            }),
            new winston.transports.DailyRotateFile({
                auditFile: './logs/rythm4-log-audit.json',
                filename: './logs/rythm4-%DATE%.log',
                maxSize: '1m',
                maxFiles: 50,
                format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
            }),
        ],
        level: configLoadResult.config?.debug ? 'debug' : 'info',
    });
    shutdownManager.registerCallback(
        () =>
            new Promise<void>((resolve) => {
                logger.debug('Flushing logger...');
                logger.once('finish', () => setTimeout(resolve, 0));
                logger.end();
            })
    );

    if (!configLoadResult.config) {
        logger.error('Failed to load config', {
            [ERROR_LOG_KEY]: formatError(configLoadResult.error),
        });

        shutdownManager.initShutdown();
        return;
    }

    logger.info('Starting music bot...', {
        commandPrefix: configLoadResult.config.command_prefix,
        activityUpdateInterval: configLoadResult.config.activity_update_interval,
        activitiesCount: configLoadResult.config.activities.length,
        hasYoutubeCookie: !!configLoadResult.config.youtube_cookie,
    });

    let trackManager;
    try {
        const youtubeProvider = await YoutubeTrackProvider.create({
            cookie: configLoadResult.config.youtube_cookie,
            cachePath: './innertube-cache',
        });

        trackManager = new TrackManager([
            youtubeProvider,
            new SoundcloudTrackProvider(),
            new SpotifyTrackProvider(youtubeProvider),
        ]);
    } catch (err) {
        logger.error('Failed to create track manager client', {
            [ERROR_LOG_KEY]: formatError(err),
        });
        return;
    }

    try {
        const bot = new MusicBot({
            messageCommandPrefix: configLoadResult.config.command_prefix,
            activities: configLoadResult.config.activities,
            activityRotationInterval: configLoadResult.config.activity_update_interval,
            trackManager,
            logger,
        });

        await bot.start(configLoadResult.config.discord_token);
        shutdownManager.registerCallback(() => bot.stop());
    } catch (err) {
        logger.error('Failed to start music bot', {
            [ERROR_LOG_KEY]: formatError(err),
        });
        shutdownManager.initShutdown();
        return;
    }
})();
