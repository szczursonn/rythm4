import type stream from 'node:stream';

export type Track = {
    readonly title: string | null;
    readonly durationMs: number | null;
    readonly webPageUrl: string | null;
    resolveToStreamable(): Promise<StreamableTrack>;
};

export type StreamableTrack = {
    createStream(): stream.Readable;
} & Track;

export type TrackCollection = {
    readonly title: string | null;
    readonly webPageUrl: string | null;
    readonly tracks: readonly Track[];
};

export type TrackSourceTrackMatch = {
    readonly type: 'track';
    resolve(): Promise<Track>;
};

export type TrackSourceCollectionMatch = {
    readonly type: 'collection';
    resolve(): Promise<TrackCollection>;
};

export type TrackSourceSearchMatch = {
    readonly type: 'search';
    readonly term: string;
    resolve(): Promise<Track | null>;
};

export type TrackSourceMatch = TrackSourceTrackMatch | TrackSourceCollectionMatch | TrackSourceSearchMatch;

export type MatchTrackSource = {
    match(query: string): TrackSourceMatch | null;
};

export type SearchTrackSource = {
    search(query: string): Promise<Track | null>;
};

export type SearchSuggestionsSource = {
    suggest(term: string): Promise<string[]>;
};
