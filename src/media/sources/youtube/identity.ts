import Innertube, { type SessionOptions } from 'youtubei.js';
import type { Logger } from '../../../logger/logger.ts';
import { YoutubeIdentityPoTokenMinter } from './identityPoTokenMinter.ts';
import { isInnertubeErrorBotCheck } from './detectBotCheck.ts';

// expire the identity this long before its PO token minter expires
const PO_TOKEN_EXPIRY_MARGIN_MS = 5 * 60 * 1000; // 5m
const MIN_IDENTITY_AGE_MS = 60 * 1000; // 1m

export class YoutubeIdentity {
    public readonly innertube: Innertube;
    readonly #minter: YoutubeIdentityPoTokenMinter | null;
    readonly #expiresAtTimestamp: number;
    readonly #logger: Logger;

    #invalidated = false;

    private constructor(
        innertube: Innertube,
        minter: YoutubeIdentityPoTokenMinter | null,
        expiresAtTimestamp: number,
        logger: Logger,
    ) {
        this.innertube = innertube;
        this.#minter = minter;
        this.#expiresAtTimestamp = expiresAtTimestamp;
        this.#logger = logger;
    }

    public static async create({
        options,
        poTokenEnabled,
        maxAgeMs,
        logger,
    }: {
        readonly options: SessionOptions;
        readonly poTokenEnabled: boolean;
        readonly maxAgeMs: number;
        readonly logger: Logger;
    }) {
        const nowTimestamp = Date.now();
        const maxExpiresAtTimestamp = nowTimestamp + maxAgeMs;

        if (poTokenEnabled) {
            try {
                const bootstrapInnertube = await Innertube.create({ ...options, retrieve_player: false });
                const visitorData = bootstrapInnertube.session.context.client.visitorData;
                if (!visitorData) {
                    throw new Error('Innertube session has no visitor data');
                }

                const minter = await YoutubeIdentityPoTokenMinter.create();
                try {
                    const sessionPoToken = await minter.mint(visitorData);
                    const innertube = await Innertube.create({
                        ...options,
                        visitor_data: visitorData,
                        po_token: sessionPoToken,
                    });

                    return new YoutubeIdentity(
                        innertube,
                        minter,
                        Math.min(
                            maxExpiresAtTimestamp,
                            Math.max(
                                minter.expiresAtTimestamp - PO_TOKEN_EXPIRY_MARGIN_MS,
                                nowTimestamp + MIN_IDENTITY_AGE_MS,
                            ),
                        ),
                        logger,
                    );
                } catch (err) {
                    minter.destroy();
                    throw err;
                }
            } catch (err) {
                logger.warn('Failed to generate PO token, continuing without', {
                    err,
                });
            }
        }

        return new YoutubeIdentity(await Innertube.create(options), null, maxExpiresAtTimestamp, logger);
    }

    public async mint(id: string) {
        if (!this.#minter) {
            throw new Error('PO Token minter uninitialized');
        }

        return this.#minter.mint(id);
    }

    public async tryMint(id: string) {
        if (this.#minter) {
            try {
                return await this.mint(id);
            } catch (err) {
                this.#logger.warn('Failed to mint PO token', {
                    id,
                    err,
                });
            }
        }

        return undefined;
    }

    public get expiresAtTimestamp() {
        return this.#expiresAtTimestamp;
    }

    public get invalidated() {
        return this.#invalidated;
    }

    public get isValid() {
        return !this.#invalidated && Date.now() < this.#expiresAtTimestamp;
    }

    public invalidate() {
        if (this.#invalidated) {
            return;
        }
        this.#invalidated = true;

        this.#minter?.destroy();
    }

    public async runWithBotCheckInvalidation<T>(fn: () => Promise<T>) {
        try {
            return await fn();
        } catch (err) {
            if (isInnertubeErrorBotCheck(err)) {
                this.invalidate();
            }
            throw err;
        }
    }
}
