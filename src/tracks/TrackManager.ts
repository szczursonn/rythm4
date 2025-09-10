import type { Readable } from 'node:stream';
import { safeParseURL } from '../utils.ts';

export interface Track {
    get title(): string;
    get durationSeconds(): number | null;
    get url(): string | null;
    get authorName(): string | null;
    createStream(): Promise<{
        stream: Readable;
        resolvedTrack: Track;
    }>;
}

export type TrackSet = {
    title: string | null;
    url: string;
    tracks: Track[];
};

export type TrackProviderQueryResult =
    | { type: 'track'; track: Track }
    | { type: 'set'; title: string | null; url: string | null; tracks: Track[] }
    | null;

export type AutocompleteTrackProviderQueryResult =
    | { type: 'text'; text: string }
    | { type: 'track'; url: string; title: string }
    | { type: 'set'; url: string; title: string };

export interface TrackProvider {
    handleQuery(query: string | URL): Promise<TrackProviderQueryResult>;
    handleAutocompleteQuery(query: string): Promise<AutocompleteTrackProviderQueryResult[]>;
}

export class TrackManager {
    public constructor(private readonly providers: TrackProvider[]) {}

    public async handleQuery(query: string): Promise<TrackProviderQueryResult> {
        const queryURL = safeParseURL(query);

        for (const provider of this.providers) {
            const queryResult = await provider.handleQuery(queryURL ?? query);
            if (queryResult !== null) {
                return queryResult;
            }
        }

        return null;
    }

    public async handleAutocompleteQuery(query: string): Promise<AutocompleteTrackProviderQueryResult[]> {
        for (const provider of this.providers) {
            const queryResult = await provider.handleAutocompleteQuery(query);
            if (queryResult.length > 0) {
                return queryResult;
            }
        }

        return [];
    }
}
