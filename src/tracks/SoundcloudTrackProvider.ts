import { Readable } from 'node:stream';
import { createAudioResource } from '@discordjs/voice';
import { create as createSCDL } from 'soundcloud-downloader';
import type { SCDL } from 'soundcloud-downloader/src/index.js';
import type { TrackInfo as SoundcloudTrackInfo } from 'soundcloud-downloader/src/info.js';
import type { Track, TrackProvider, TrackProviderQueryResult } from './TrackManager.ts';

export class SoundcloudTrackProvider implements TrackProvider {
    private readonly scdl = createSCDL({});

    public async handleQuery(query: string | URL): Promise<TrackProviderQueryResult> {
        if (!(query instanceof URL)) {
            return null;
        }

        const urlString = query.toString();

        if (this.scdl.isValidUrl(urlString)) {
            if (this.scdl.isPlaylistURL(urlString)) {
                return {
                    type: 'set',
                    ...(await this.getTracksByURL(urlString)),
                };
            }

            return {
                type: 'track',
                track: await this.getTrackByURL(urlString),
            };
        }

        return null;
    }

    public async handleAutocompleteQuery() {
        return [];
    }

    public async getTrackByURL(url: string) {
        const trackInfo = await this.scdl.getInfo(url);
        return new SoundcloudTrack(this.scdl, trackInfo);
    }

    public async getTracksByURL(url: string) {
        const setInfo = await this.scdl.getSetInfo(url);
        return {
            title: setInfo.label_name ?? null,
            url: setInfo.permalink_url,
            tracks: setInfo.tracks.map((trackInfo) => new SoundcloudTrack(this.scdl, trackInfo)),
        };
    }
}

class SoundcloudTrack implements Track {
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

    async createAudioResource() {
        if (this.url === null) {
            throw new Error('soundcloud track is missing url');
        }

        const stream = (await this.scdl.download(this.url)) as unknown;
        if (!(stream instanceof Readable)) {
            throw new Error('scdl did not return Readable');
        }

        return {
            audioResource: createAudioResource(stream),
            resolvedTrack: this,
        };
    }
}
