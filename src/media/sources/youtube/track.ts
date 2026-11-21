import stream from 'node:stream';
import { Constants, type YT } from 'youtubei.js';
import { bufferedHttpChunks } from '../../../utils/bufferedHttpStream.ts';
import type { StreamableTrack, Track } from '../../media.ts';
import { createYoutubeWatchPageUrl } from './url.ts';
import type { YoutubeTrackSource } from './source.ts';
import type { YoutubeIdentity } from './identity.ts';

const STREAMING_DATA_EXPIRY_MARGIN_MS = 10 * 60 * 1000; // 10m

export class YoutubeTrack implements StreamableTrack {
    readonly #source;
    readonly #videoId;
    readonly #identity;
    readonly #info;
    readonly #videoPoToken;

    public constructor(
        source: YoutubeTrackSource,
        {
            videoId,
            identity,
            info,
            videoPoToken,
        }: {
            readonly videoId: string;
            readonly identity: YoutubeIdentity;
            readonly info: YT.VideoInfo;
            readonly videoPoToken: string | undefined;
        },
    ) {
        this.#source = source;
        this.#videoId = videoId;
        this.#identity = identity;
        this.#info = info;
        this.#videoPoToken = videoPoToken;
    }

    public get title() {
        return this.#info.basic_info.title ?? null;
    }

    public get durationMs() {
        return this.#info.basic_info.duration ? this.#info.basic_info.duration * 1000 : null;
    }

    public get webPageUrl() {
        return (
            this.#info.basic_info.url_canonical ??
            (this.#info.basic_info.id ? createYoutubeWatchPageUrl(this.#info.basic_info.id) : null)
        );
    }

    public resolveToStreamable() {
        if (!this.#identity.isValid || this.#isStreamingDataStale) {
            return this.#source.getTrackById(this.#videoId);
        }

        return Promise.resolve(this);
    }

    public createStream() {
        return stream.Readable.from(this.#createStreamGenerator(), { objectMode: false });
    }

    // .download() unused because:
    // 1. puts session-bound PO token on the stream URL even though server expects video-bound one
    // 2. no buffering - keeps connections open for too long and server kills them
    async *#createStreamGenerator() {
        const format = this.#info.chooseFormat({ type: 'audio', quality: 'best' });
        const url = new URL(await format.decipher(this.#identity.innertube.session.player));
        if (this.#videoPoToken) {
            url.searchParams.set('pot', this.#videoPoToken);
        }
        url.searchParams.set('cpn', this.#info.cpn);

        const fetchFn = this.#identity.innertube.session.http.fetch_function;
        yield* bufferedHttpChunks({
            contentLength: format.content_length,
            fetchRange: (start, end, signal) => {
                const urlWithRange = new URL(url);
                urlWithRange.searchParams.set('range', `${start}-${end}`);
                return fetchFn(urlWithRange, { headers: Constants.STREAM_HEADERS, signal });
            },
        });
    }

    get #isStreamingDataStale() {
        return this.#info.streaming_data?.expires
            ? this.#info.streaming_data.expires.getTime() - Date.now() < STREAMING_DATA_EXPIRY_MARGIN_MS
            : false;
    }
}

export class YoutubeLazyTrack implements Track {
    readonly #source;
    readonly #videoId;

    public readonly title;
    public readonly durationMs;

    public constructor(
        source: YoutubeTrackSource,
        {
            videoId,
            title,
            durationMs,
        }: {
            readonly videoId: string;
            readonly title: string | null;
            readonly durationMs: number | null;
        },
    ) {
        this.#source = source;
        this.#videoId = videoId;

        this.title = title;
        this.durationMs = durationMs;
    }

    public get webPageUrl() {
        return createYoutubeWatchPageUrl(this.#videoId);
    }

    public resolveToStreamable() {
        return this.#source.getTrackById(this.#videoId);
    }
}
