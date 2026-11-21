import type { Track, TrackCollection } from '../../media.ts';
import { createYoutubePlaylistUrl } from './url.ts';

export class YoutubePlaylist implements TrackCollection {
    public readonly title;
    public readonly webPageUrl;
    public readonly tracks;

    public constructor({
        playlistId,
        title,
        tracks,
    }: {
        playlistId: string;
        title: string | null;
        tracks: readonly Track[];
    }) {
        this.title = title;
        this.webPageUrl = createYoutubePlaylistUrl(playlistId);
        this.tracks = tracks;
    }
}
