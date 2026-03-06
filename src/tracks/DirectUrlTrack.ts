import { Readable } from 'node:stream';
import type { ReadableStream } from 'node:stream/web';
import type { Track } from './TrackManager.ts';

export class DirectUrlTrack implements Track {
    public constructor(
        private readonly trackTitle: string,
        private readonly trackUrl: string,
    ) {}

    get title() {
        return this.trackTitle;
    }

    get durationSeconds() {
        return null;
    }

    get url() {
        return this.trackUrl;
    }

    get authorName() {
        return null;
    }

    async createStream() {
        const response = await fetch(this.trackUrl);
        if (!response.ok || response.body === null) {
            throw new Error(`Failed to fetch audio from URL: ${response.status} ${response.statusText}`);
        }

        const stream = Readable.fromWeb(response.body as ReadableStream);

        return {
            stream,
            resolvedTrack: this,
        };
    }
}
