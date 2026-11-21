import type { MatchTrackSource } from './media.ts';

export class MultiMatchTrackSource implements MatchTrackSource {
    readonly #sources: MatchTrackSource[] = [];

    public add(source: MatchTrackSource) {
        this.#sources.push(source);
    }

    public match(query: string) {
        for (const source of this.#sources) {
            const match = source.match(query);
            if (match) {
                return match;
            }
        }

        return null;
    }
}
