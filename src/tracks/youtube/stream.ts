// import { Readable } from 'node:stream';
// import type { Innertube, YT } from 'youtubei.js';
// import { ResilientStream } from '../ResilientStream.ts';

// const HIGHWATER_MARK = 1024 * 1024; // 1mb

// export class ResilientYoutubeTrackStream extends ResilientStream {
//     private videoId: string;
//     private itag: number;
//     private contentLength: number;

//     private currentVideoInfo: YT.VideoInfo;
//     private hasInitialVideoInfoBeenUsed = false;

//     public constructor(private readonly innertube: Innertube, initialVideoInfo: YT.VideoInfo) {
//         super();

//         const videoId = initialVideoInfo.basic_info.id;
//         if (!videoId) {
//             throw new Error('no video id');
//         }
//         this.videoId = videoId;

//         const format = initialVideoInfo.chooseFormat({
//             type: 'audio',
//         });
//         if (!format.content_length) {
//             throw new Error('format is missing content length');
//         }

//         this.itag = format.itag;
//         this.contentLength = format.content_length;

//         this.currentVideoInfo = initialVideoInfo;
//     }

//     protected override async createStream(byteOffset: number): Promise<Readable> {
//         if (this.hasInitialVideoInfoBeenUsed) {
//             this.currentVideoInfo = await this.innertube.getBasicInfo(this.videoId);
//         }
//         this.hasInitialVideoInfoBeenUsed = true;

//         const webStream = await this.currentVideoInfo.download({
//             itag: this.itag,
//             range: {
//                 start: byteOffset,
//                 end: this.contentLength,
//             },
//         });

//         // @ts-expect-error
//         return Readable.fromWeb(webStream, {
//             highWaterMark: HIGHWATER_MARK,
//         });
//     }
// }
