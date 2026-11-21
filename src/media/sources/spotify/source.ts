import type { MatchTrackSource, SearchTrackSource } from '../../media.ts';
import { parseSpotifyUri, type SpotifyUri } from './uri.ts';
import { createSpotifyUrl, urlStringToSpotifyUri } from './url.ts';
import { fetchSpotifyEmbedData } from './scrapeEmbed.ts';
import { SpotifyTrack } from './track.ts';
import { SpotifyTrackCollection } from './collection.ts';

export class SpotifyTrackSource implements MatchTrackSource {
    readonly #searchSource;

    public constructor(searchSource: SearchTrackSource) {
        this.#searchSource = searchSource;
    }

    public match(query: string) {
        const uri = parseSpotifyUri(query) ?? urlStringToSpotifyUri(query);

        switch (uri?.type) {
            case 'track':
                return this.#createTrackMatch(uri);
            case 'playlist':
            case 'album':
                return this.#createCollectionMatch(uri);
            default:
                return null;
        }
    }

    #createTrackMatch(uri: SpotifyUri) {
        return {
            type: 'track',
            resolve: () => this.#getTrackByUri(uri),
        } as const;
    }

    #createCollectionMatch(uri: SpotifyUri) {
        return {
            type: 'collection',
            resolve: () => this.#getTrackCollectionByUri(uri),
        } as const;
    }

    async #getTrackByUri(uri: SpotifyUri) {
        const entity = (await fetchSpotifyEmbedData(uri)).props.pageProps.state.data.entity;
        return new SpotifyTrack(
            this.#searchSource,
            [
                entity.title,
                entity.artists
                    ?.map((artist) => artist.name)
                    .filter(Boolean)
                    .join(', '),
            ]
                .filter(Boolean)
                .join(': '),
            {
                title: entity.title,
                durationMs: entity.duration ?? null,
                webPageUrl: createSpotifyUrl(uri),
            },
        );
    }

    async #getTrackCollectionByUri(uri: SpotifyUri) {
        const entity = (await fetchSpotifyEmbedData(uri)).props.pageProps.state.data.entity;

        return new SpotifyTrackCollection({
            title: entity.title,
            webPageUrl: createSpotifyUrl(uri),
            tracks:
                entity.trackList?.map(
                    (trackEntity) =>
                        new SpotifyTrack(
                            this.#searchSource,
                            [trackEntity.title, trackEntity.subtitle].filter(Boolean).join(': '),
                            {
                                title: trackEntity.title,
                                durationMs: trackEntity.duration,
                                webPageUrl: createSpotifyUrl(trackEntity.uri),
                            },
                        ),
                ) ?? [],
        });
    }
}
