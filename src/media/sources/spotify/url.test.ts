import { describe, it, expect } from 'vitest';
import { urlToSpotifyUri } from './url.ts';

describe('transforming url to uri', () => {
    it('accepts valid urls', () => {
        for (const testCase of [
            {
                input: 'https://open.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J',
                expected: { type: 'track', id: '1dzQoRqT5ucxXVaAhTcT0J' },
            },
            {
                input: 'https://open.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J/',
                expected: { type: 'track', id: '1dzQoRqT5ucxXVaAhTcT0J' },
            },
            {
                input: 'https://open.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J?si=abc123',
                expected: { type: 'track', id: '1dzQoRqT5ucxXVaAhTcT0J' },
            },
            {
                input: 'https://open.spotify.com/playlist/7k9s3tgdknT8eNp4ECrBeR',
                expected: { type: 'playlist', id: '7k9s3tgdknT8eNp4ECrBeR' },
            },
            {
                input: 'https://open.spotify.com/album/4aawyAB9vmqN3uQ7FjRGTy',
                expected: { type: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' },
            },
            {
                input: 'https://open.spotify.com/intl-pl/track/1dzQoRqT5ucxXVaAhTcT0J?si=abc123',
                expected: { type: 'track', id: '1dzQoRqT5ucxXVaAhTcT0J' },
            },
            {
                input: 'https://open.spotify.com/intl-pt-br/album/4aawyAB9vmqN3uQ7FjRGTy',
                expected: { type: 'album', id: '4aawyAB9vmqN3uQ7FjRGTy' },
            },
        ]) {
            const result = urlToSpotifyUri(new URL(testCase.input));
            expect(result?.type).toBe(testCase.expected.type);
            expect(result?.id).toBe(testCase.expected.id);
        }
    });

    it('rejects unsupported entity types', () => {
        for (const input of [
            'https://open.spotify.com/artist/0gxyHStUsqpMadRV0Di1Qt',
            'https://open.spotify.com/episode/1dzQoRqT5ucxXVaAhTcT0J',
            'https://open.spotify.com/intl-pl/show/1dzQoRqT5ucxXVaAhTcT0J',
        ]) {
            expect(urlToSpotifyUri(new URL(input))).toBeNull();
        }
    });

    it('rejects malformed paths', () => {
        for (const input of [
            'https://open.spotify.com/track',
            'https://open.spotify.com/track/',
            'https://open.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J/extra',
            'https://open.spotify.com/foo/track/1dzQoRqT5ucxXVaAhTcT0J',
            'https://open.spotify.com/intl-/track/1dzQoRqT5ucxXVaAhTcT0J',
            'https://open.spotify.com/intl-pl/intl-pl/track/1dzQoRqT5ucxXVaAhTcT0J',
            'https://open.spotify.com/track/1dzQoRqT5ucxX-VaAhTcT0J',
        ]) {
            expect(urlToSpotifyUri(new URL(input))).toBeNull();
        }
    });

    it('rejects bad protocol', () => {
        for (const input of [
            'tcp://open.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J',
            'http://open.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J',
        ]) {
            expect(urlToSpotifyUri(new URL(input))).toBeNull();
        }
    });

    it('rejects bad host', () => {
        for (const input of [
            'https://spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J',
            'https://www.spotify.com/track/1dzQoRqT5ucxXVaAhTcT0J',
        ]) {
            expect(urlToSpotifyUri(new URL(input))).toBeNull();
        }
    });
});
