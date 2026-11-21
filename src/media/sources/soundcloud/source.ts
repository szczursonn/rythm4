import type { MatchTrackSource } from '../../media.ts';

export class SoundcloudTrackSource implements MatchTrackSource {
    public match(_query: string) {
        return null;
    }
}
