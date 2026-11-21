import type { TrackCollection, Track } from '../../media.ts';

export class SpotifyTrackCollection implements TrackCollection {
    public readonly title;
    public readonly webPageUrl;
    public readonly tracks;

    public constructor({
        title,
        webPageUrl,
        tracks,
    }: {
        title: string | null;
        webPageUrl: string | null;
        tracks: readonly Track[];
    }) {
        this.title = title;
        this.webPageUrl = webPageUrl;
        this.tracks = tracks;
    }
}
