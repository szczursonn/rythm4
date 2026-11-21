import type { Track, SearchTrackSource } from '../../media.ts';

export class SpotifyTrack implements Track {
    readonly #searchSource;
    readonly #searchQuery;

    public readonly title;
    public readonly durationMs;
    public readonly webPageUrl;

    public constructor(
        searchSource: SearchTrackSource,
        searchQuery: string,
        {
            title,
            durationMs,
            webPageUrl,
        }: {
            readonly title: string;
            readonly durationMs: number | null;
            readonly webPageUrl: string;
        },
    ) {
        this.#searchSource = searchSource;
        this.#searchQuery = searchQuery;

        this.title = title;
        this.durationMs = durationMs;
        this.webPageUrl = webPageUrl;
    }

    public async resolveToStreamable() {
        const searchedTrack = await this.#searchSource.search(this.#searchQuery);
        if (!searchedTrack) {
            throw new Error('Unable to resolve the track via search');
        }

        return searchedTrack.resolveToStreamable();
    }
}
