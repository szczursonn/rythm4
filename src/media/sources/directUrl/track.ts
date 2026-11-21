import stream from 'node:stream';
import { bufferedHttpChunks } from '../../../utils/bufferedHttpStream.ts';
import type { StreamableTrack } from '../../media.ts';

export class DirectUrlTrack implements StreamableTrack {
    public readonly title;
    public readonly webPageUrl;
    public readonly durationMs;

    public constructor({
        title,
        url,
        durationMs = null,
    }: {
        title: string | null;
        url: string;
        durationMs?: number | null;
    }) {
        this.title = title;
        this.webPageUrl = url;
        this.durationMs = durationMs;
    }

    public resolveToStreamable() {
        return Promise.resolve(this);
    }

    public createStream() {
        return stream.Readable.from(
            bufferedHttpChunks({
                fetchRange: (start, end, signal) =>
                    fetch(this.webPageUrl, { headers: { Range: `bytes=${start}-${end}` }, signal }),
            }),
            { objectMode: false },
        );
    }
}
