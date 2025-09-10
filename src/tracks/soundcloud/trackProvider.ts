import { create as createSCDL } from 'soundcloud-downloader';
import type { TrackProvider, TrackProviderQueryResult } from '../TrackManager.ts';
import { SoundcloudTrack } from './tracks.ts';

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
