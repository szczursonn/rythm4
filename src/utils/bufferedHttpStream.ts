import timersp from 'node:timers/promises';

const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024; // 2MiB
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BACKOFF_MS = 500;

const CONTENT_RANGE_TOTAL_REGEX = /^bytes \d+-\d+\/(\d+)$/;

export type HttpRangeFetcher = (start: number, end: number, signal: AbortSignal) => Promise<Response>;

class HttpStreamError extends Error {
    public readonly status;

    public constructor(status: number, message = `HTTP request failed with status ${status}`) {
        super(message);
        this.name = 'HttpStreamError';
        this.status = status;
    }
}

type FetchChunkResult =
    | { readonly type: 'chunk'; readonly data: Uint8Array; readonly totalLength: number | null }
    | { readonly type: 'end' }
    | { readonly type: 'unranged'; readonly body: ReadableStream<Uint8Array> };

const discardBody = async (response: Response) => {
    try {
        await response.body?.cancel();
    } catch {}
};

const parseNonNegativeInt = (value: string | null | undefined) => {
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
};

export async function* bufferedHttpChunks({
    fetchRange,
    contentLength,
    chunkSize = DEFAULT_CHUNK_SIZE,
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    retryBackoffMs = DEFAULT_RETRY_BACKOFF_MS,
}: {
    readonly fetchRange: HttpRangeFetcher;
    readonly contentLength?: number | null;
    readonly chunkSize?: number;
    readonly maxAttempts?: number;
    readonly retryBackoffMs?: number;
}): AsyncGenerator<Uint8Array, void, undefined> {
    const abortController = new AbortController();
    const fetchChunk = (start: number) =>
        fetchChunkWithRetries({
            fetchRange,
            start,
            chunkSize,
            maxAttempts,
            retryBackoffMs,
            signal: abortController.signal,
        });

    // a zero length is treated as unknown rather than as an empty resource
    let totalLength = contentLength && contentLength > 0 ? contentLength : null;
    let pending = fetchChunk(0);
    try {
        for (let start = 0; ;) {
            const result = await pending;

            if (result.type === 'end') {
                return;
            }

            if (result.type === 'unranged') {
                for await (const chunk of result.body) {
                    yield chunk;
                }
                return;
            }

            totalLength ??= result.totalLength;
            const nextStart = start + result.data.byteLength;
            // without a known length, a short chunk means end of a resource
            const isLast =
                result.data.byteLength === 0 ||
                (totalLength !== null ? nextStart >= totalLength : result.data.byteLength < chunkSize);

            if (!isLast) {
                // prefetch while the current chunk is consumed
                pending = fetchChunk(nextStart);
            }

            if (result.data.byteLength > 0) {
                yield result.data;
            }

            if (isLast) {
                return;
            }
            start = nextStart;
        }
    } finally {
        abortController.abort();
        pending.catch(() => {
            // prevent prefetch unhandled rejection
        });
    }
}

const fetchChunkWithRetries = async ({
    fetchRange,
    start,
    chunkSize,
    maxAttempts,
    retryBackoffMs,
    signal,
}: {
    readonly fetchRange: HttpRangeFetcher;
    readonly start: number;
    readonly chunkSize: number;
    readonly maxAttempts: number;
    readonly retryBackoffMs: number;
    readonly signal: AbortSignal;
}): Promise<FetchChunkResult> => {
    for (let attempt = 1; ; attempt++) {
        try {
            return await fetchChunk({ fetchRange, start, chunkSize, signal });
        } catch (err) {
            const isClientError = err instanceof HttpStreamError && err.status < 500;
            if (signal.aborted || isClientError || attempt >= maxAttempts) {
                throw err;
            }
        }

        await timersp.setTimeout(retryBackoffMs * attempt, undefined, { signal });
    }
};

const fetchChunk = async ({
    fetchRange,
    start,
    chunkSize,
    signal,
}: {
    readonly fetchRange: HttpRangeFetcher;
    readonly start: number;
    readonly chunkSize: number;
    readonly signal: AbortSignal;
}): Promise<FetchChunkResult> => {
    const end = start + chunkSize - 1;
    const response = await fetchRange(start, end, signal);

    // range starts past the end
    if (response.status === 416 && start > 0) {
        await discardBody(response);
        return { type: 'end' };
    }

    if (!response.ok) {
        await discardBody(response);
        throw new HttpStreamError(response.status);
    }

    if (response.status !== 206) {
        const responseLength = parseNonNegativeInt(response.headers.get('Content-Length'));
        if (responseLength === null || responseLength > chunkSize) {
            if (start === 0 && response.body) {
                return { type: 'unranged', body: response.body };
            }

            await discardBody(response);
            throw new HttpStreamError(response.status, 'Server ignored the requested range mid-stream');
        }
    }

    return {
        type: 'chunk',
        data: new Uint8Array(await response.arrayBuffer()),
        totalLength: parseNonNegativeInt(
            CONTENT_RANGE_TOTAL_REGEX.exec(response.headers.get('Content-Range') ?? '')?.[1],
        ),
    };
};
