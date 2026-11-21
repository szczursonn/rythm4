import stream from 'node:stream';
import type { Logger } from '../logger/logger.ts';
import type { MatchTrackSource } from '../media/media.ts';

const REQUIRED_BYTES = 16 * 1024;
const READ_TIMEOUT_MS = 30 * 1000;

export type HealthCheckFailure = {
    readonly query: string;
    readonly error: unknown;
};

export class HealthChecker {
    readonly #matchSource;
    readonly #logger;
    readonly #queries;

    #inProgressRun: Promise<HealthCheckFailure[]> | null = null;

    public constructor({
        matchSource,
        queries,
        logger,
    }: {
        readonly matchSource: MatchTrackSource;
        readonly queries: readonly string[];
        readonly logger: Logger;
    }) {
        this.#matchSource = matchSource;
        this.#queries = queries;
        this.#logger = logger;
    }

    public run() {
        return (this.#inProgressRun ??= this.#runAll().finally(() => {
            this.#inProgressRun = null;
        }));
    }

    async #runAll() {
        this.#logger.debug('Running health check...');

        const failures: HealthCheckFailure[] = [];
        for (const query of this.#queries) {
            try {
                await this.#checkQuery(query);
            } catch (err) {
                failures.push({ query, error: err });
            }
        }

        if (failures.length === 0) {
            this.#logger.info('Health check succeeded');
        } else {
            this.#logger.error('Health check failed', {
                failures,
            });
        }

        return failures;
    }

    async #checkQuery(query: string) {
        const match = this.#matchSource.match(query);
        if (!match) {
            throw new Error('Query was not matched');
        }
        if (match.type !== 'track') {
            throw new Error(`Query was not matched to ${match.type} instead of a track`);
        }

        const track = await match.resolve();
        const streamableTrack = await track.resolveToStreamable();
        const trackStream = streamableTrack.createStream();

        let bytesRead = 0;
        try {
            stream.addAbortSignal(AbortSignal.timeout(READ_TIMEOUT_MS), trackStream);

            for await (const chunk of trackStream as AsyncIterable<Uint8Array>) {
                bytesRead += chunk.length;
                if (bytesRead >= REQUIRED_BYTES) {
                    return;
                }
            }
        } finally {
            trackStream.destroy();
        }

        throw new Error(`Stream ended after ${bytesRead} bytes`);
    }
}
