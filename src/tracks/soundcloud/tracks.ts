import { Readable } from 'node:stream';
import type { SCDL } from 'soundcloud-downloader/src/index.js';
import type { TrackInfo as SoundcloudTrackInfo } from 'soundcloud-downloader/src/info.js';
import type { Track } from '../TrackManager.ts';

export class SoundcloudTrack implements Track {
    public constructor(private readonly scdl: SCDL, private readonly trackInfo: SoundcloudTrackInfo) {}

    get title() {
        return this.trackInfo.title ?? 'untitled';
    }

    get durationSeconds() {
        return this.trackInfo.duration ? this.trackInfo.duration / 1000 : null;
    }

    get url() {
        return this.trackInfo.permalink_url ?? null;
    }

    get authorName() {
        return this.trackInfo.user?.username ?? null;
    }

    async createStream() {
        if (this.url === null) {
            throw new Error('soundcloud track is missing url');
        }

        const stream = (await this.scdl.download(this.url)) as unknown;
        if (!(stream instanceof Readable)) {
            throw new Error('scdl did not return Readable');
        }

        return {
            stream,
            resolvedTrack: this,
        };
    }
}
