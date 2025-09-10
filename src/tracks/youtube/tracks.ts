import { Readable } from 'node:stream';
import type { YT } from 'youtubei.js';
import type { Track } from '../TrackManager.ts';
import { YoutubeTrackProvider } from './trackProvider.ts';
import { createVideoURL } from './urls.ts';
// import { ResilientYoutubeTrackStream } from './stream.ts';

export class YoutubeTrack implements Track {
    public constructor(
        public readonly provider: YoutubeTrackProvider,
        public readonly videoInfo: YT.VideoInfo,
        public readonly videoInfoForStream: YT.VideoInfo
    ) {}

    get title() {
        return this.videoInfo.basic_info.title ?? '<unknown>';
    }

    get durationSeconds() {
        return this.videoInfo.basic_info.duration ?? null;
    }

    get url() {
        return (
            this.videoInfo.basic_info.url_canonical ??
            (this.videoInfo.basic_info.id ? createVideoURL(this.videoInfo.basic_info.id) : null)
        );
    }

    get authorName() {
        return this.videoInfo.basic_info.channel?.name ?? this.videoInfo.basic_info.author ?? null;
    }

    async createStream() {
        const format = this.videoInfoForStream.chooseFormat({
            type: 'audio',
        });
        if (!format.content_length) {
            throw new Error('format is missing content length');
        }

        const itag = format.itag;
        const contentLength = format.content_length;

        const webStream = await this.videoInfoForStream.download({
            type: 'audio',
            itag,
            range: {
                start: 0,
                end: contentLength,
            },
        });

        // @ts-expect-error
        const stream = Readable.fromWeb(webStream, {
            highWaterMark: 1024 * 1024,
        });

        return {
            stream,
            resolvedTrack: this,
        };
    }
}

export class LazyYoutubeTrack implements Track {
    public constructor(
        public readonly provider: YoutubeTrackProvider,
        public readonly videoId: string,
        public readonly title: string,
        public readonly durationSeconds: number,
        public readonly authorName: string | null
    ) {}

    get url() {
        return createVideoURL(this.videoId);
    }

    async createStream() {
        const resolvedTrack = await this.provider.getTrackById(this.videoId);
        return resolvedTrack.createStream();
    }
}
