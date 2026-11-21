import path from 'node:path';
import { UniversalCache, type ClientType, type SessionOptions } from 'youtubei.js';
import type { Logger } from '../../../logger/logger.ts';
import { installUnsafeInnertubeEval } from './eval.ts';
import { YoutubeIdentity } from './identity.ts';

const INNERTUBE_CACHE_SESSION_DATA_DIR_NAME = 'innertube_session_data';

type CachedIdentity = {
    readonly promise: Promise<YoutubeIdentity>;
    identity: YoutubeIdentity | null;
};

export class YoutubeIdentityManager {
    readonly #options: SessionOptions;
    readonly #maxAgeMs;
    readonly #poTokenEnabled;
    readonly #logger;

    #cached: CachedIdentity | null = null;
    #sessionDataNeedsRefresh = true;

    public constructor({
        clientType,
        playerIdOverride,
        cookie,
        maxAgeMs,
        cacheDirPath,
        poTokenEnabled,
        logger,
    }: {
        readonly clientType: ClientType;
        readonly playerIdOverride?: string;
        readonly cookie?: string;
        readonly maxAgeMs: number;
        readonly cacheDirPath: string;
        readonly poTokenEnabled: boolean;
        readonly logger: Logger;
    }) {
        installUnsafeInnertubeEval();

        this.#options = {
            client_type: clientType,
            cache: new UniversalCache(true, path.join(cacheDirPath, clientType)),
            player_id: playerIdOverride,
            cookie,
        };
        this.#maxAgeMs = maxAgeMs;
        this.#poTokenEnabled = poTokenEnabled;
        this.#logger = logger;
    }

    public getCachedIdentity() {
        const cached = this.#cached;
        if (cached && (cached.identity === null || cached.identity.isValid)) {
            return cached.promise;
        }

        if (cached?.identity) {
            // only identities invalidated by a bot check need fresh session data, not expired ones
            if (cached.identity.invalidated) {
                this.#sessionDataNeedsRefresh = true;
            }
            cached.identity.invalidate();
        }

        const newCached: CachedIdentity = {
            promise: this.#createIdentity(),
            identity: null,
        };
        this.#cached = newCached;
        newCached.promise.then(
            (identity) => {
                newCached.identity = identity;
            },
            () => {
                if (this.#cached === newCached) {
                    this.#cached = null;
                }
                this.#sessionDataNeedsRefresh = true;
            },
        );

        return newCached.promise;
    }

    async #createIdentity() {
        if (this.#sessionDataNeedsRefresh) {
            await this.#options.cache?.remove(INNERTUBE_CACHE_SESSION_DATA_DIR_NAME);
            this.#sessionDataNeedsRefresh = false;
        }

        return YoutubeIdentity.create({
            options: this.#options,
            poTokenEnabled: this.#poTokenEnabled,
            maxAgeMs: this.#maxAgeMs,
            logger: this.#logger,
        });
    }
}
