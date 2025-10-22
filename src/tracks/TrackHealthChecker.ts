import { setTimeout, setInterval, clearInterval } from 'node:timers';
import { MessageFlags } from 'discord.js';
import { createAudioResource } from '@discordjs/voice';
import type { MusicBot } from '../MusicBot.ts';
import { ERROR_LOG_KEY, formatError } from '../loggerUtils.ts';
import { ICONS } from '../icons.ts';
import { wait } from '../utils.ts';

const AUTO_CHECK_INTERVAL_DURATION = 12 * 60 * 60 * 1000;

const START_POLL_INTERVAL = 50;
const START_TIMEOUT = 5 * 1000;
const PACKET_READ_COUNT_REQUIRED = 10;
const PACKET_READ_INTERVAL = 20;
const PACKET_READ_TIMEOUT = 5 * 1000;

export type TrackHealthCheckTest = {
    label: string;
    query: string;
};

export class TrackHealthChecker {
    private autoCheckIntervalRef: ReturnType<typeof setInterval> | null = null;

    public constructor(public readonly bot: MusicBot, public readonly tests: Readonly<TrackHealthCheckTest[]>) {}

    public startAutoCheck() {
        if (this.autoCheckIntervalRef !== null) {
            return;
        }

        this.autoCheckIntervalRef = setInterval(this.onInterval.bind(this), AUTO_CHECK_INTERVAL_DURATION);
        this.bot.logger.debug('Started health checker interval');
    }

    public stopAutoCheck() {
        if (this.autoCheckIntervalRef === null) {
            return;
        }

        clearInterval(this.autoCheckIntervalRef);
        this.autoCheckIntervalRef = null;
        this.bot.logger.debug('Stopped health checker interval');
    }

    public async runHealthCheck() {
        this.bot.logger.debug('Running health check...');

        const failures = [] as ((typeof this.tests)[number] & {
            [ERROR_LOG_KEY]: string;
        })[];

        for (const test of this.tests) {
            this.bot.logger.debug('Running health check test...', {
                test,
            });

            try {
                const queryResult = await this.bot.trackManager.handleQuery(test.query);
                if (queryResult === null) {
                    throw new Error('query did not return any results');
                }

                const track = queryResult.type === 'track' ? queryResult.track : queryResult.tracks[0];
                if (!track) {
                    throw new Error('got empty playlist');
                }

                const { stream } = await track.createStream();
                const audioResource = createAudioResource(stream, {
                    silencePaddingFrames: 0,
                });

                const { promise, resolve, reject } = Promise.withResolvers();
                const handleError = (err: Error) => {
                    reject(err);
                };
                audioResource.playStream.on('error', handleError);

                setTimeout(async () => {
                    const pollStartTimestamp = Date.now();
                    while (!audioResource.started && !audioResource.ended) {
                        await wait(START_POLL_INTERVAL);

                        if (Date.now() - pollStartTimestamp > START_TIMEOUT) {
                            reject(new Error('stream start timed out'));
                            return;
                        }
                    }

                    const readStartTimestamp = Date.now();
                    let packetsRead = 0;
                    while (packetsRead < PACKET_READ_COUNT_REQUIRED) {
                        const packet = audioResource.read();
                        if (packet !== null) {
                            packetsRead++;
                        }

                        if (Date.now() - readStartTimestamp > PACKET_READ_TIMEOUT) {
                            reject(new Error('stream read timed out'));
                            return;
                        }

                        await wait(PACKET_READ_INTERVAL);
                    }

                    resolve(null);
                }, 0);

                await promise.finally(() => {
                    audioResource.playStream.off('error', handleError);
                    audioResource.playStream.destroy();
                    audioResource.playStream.read();
                });
            } catch (err) {
                failures.push({
                    ...test,
                    [ERROR_LOG_KEY]: formatError(err),
                });
            }
        }

        if (failures.length === 0) {
            this.bot.logger.info('Health check succeeded');
            this.bot.activityManager.presenceStatus = 'online';
        } else {
            this.bot.logger.error('Health check failed', {
                failures,
            });
            this.bot.activityManager.presenceStatus = 'dnd';
        }

        return failures;
    }

    public static createFailureMessage(failures: Awaited<ReturnType<TrackHealthChecker['runHealthCheck']>>) {
        return `${ICONS.APP_ERROR} **Health check failed** ${failures.map(
            (failure) => `\n- ${failure.label} (${failure.query})\n${failure[ERROR_LOG_KEY]}`
        )}`;
    }

    private async onInterval() {
        const failures = await this.runHealthCheck();

        if (failures.length > 0) {
            await this.bot.sendMessageToAdmins({
                content: TrackHealthChecker.createFailureMessage(failures),
                flags: MessageFlags.SuppressEmbeds,
            });
        }
    }
}
