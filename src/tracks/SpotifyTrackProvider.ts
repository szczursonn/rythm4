import { parse as parseHTML } from 'node-html-parser';
import type { TrackProvider, TrackProviderQueryResult } from './TrackManager.ts';
import type { YoutubeTrackProvider } from './YoutubeTrackProvider.ts';

export class SpotifyTrackProvider implements TrackProvider {
    public constructor(private readonly youtubeProvider: YoutubeTrackProvider) {}

    public async handleQuery(query: string | URL): Promise<TrackProviderQueryResult> {
        if (!(query instanceof URL)) {
            return null;
        }

        if (query.hostname !== 'open.spotify.com') {
            return null;
        }

        const res = await fetch(query);
        const document = parseHTML(await res.text());

        if (document.querySelector('meta[property="og:type"]')?.getAttribute('content') !== 'music.song') {
            return null;
        }

        const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        const authorName = document.querySelector('meta[name="music:musician_description"]')?.getAttribute('content');

        if (!title) {
            throw new Error('failed to find title');
        }

        const youtubeTrack = await this.youtubeProvider.getTrackBySearch(
            [authorName, title].filter(Boolean).join(' - ')
        );
        if (youtubeTrack === null) {
            throw new Error('failed to find matching youtube video');
        }

        return {
            type: 'track',
            track: youtubeTrack,
        };
    }

    public async handleAutocompleteQuery() {
        return [];
    }
}
