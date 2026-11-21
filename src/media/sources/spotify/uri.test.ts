import { describe, it, expect } from 'vitest';
import { parseSpotifyUri } from './uri.ts';

describe('parsing', () => {
    it('parses valid uris', () => {
        for (const testCase of [
            {
                input: 'spotify:track:123',
                expected: {
                    id: '123',
                    type: 'track',
                },
            },
            {
                input: 'spotify:playlist:7k9s3tgdknT8eNp4ECrBeR',
                expected: {
                    id: '7k9s3tgdknT8eNp4ECrBeR',
                    type: 'playlist',
                },
            },
        ]) {
            const result = parseSpotifyUri(testCase.input);
            expect(result?.id).toBe(testCase.expected.id);
            expect(result?.type).toBe(testCase.expected.type);
        }
    });

    it('rejects invalid namespace', () => {
        for (const input of ['skibidi:track:7MZyREIMPkkg7cwzzACw67', ':track:7MZyREIMPkkg7cwzzACw67']) {
            expect(parseSpotifyUri(input)).toBeNull();
        }
    });

    it('rejects extra segments', () => {
        for (const input of [
            'spotify:track:7MZyREIMPkkg7cwzzACw67:',
            ':spotify:track:7MZyREIMPkkg7cwzzACw67',
            'spotify:track:7MZyREIMPkkg7cwzzACw67:skibidi',
            'skibidi:spotify:track:7MZyREIMPkkg7cwzzACw67',
        ]) {
            expect(parseSpotifyUri(input)).toBeNull();
        }
    });

    it('rejects unsupported entity types', () => {
        expect(parseSpotifyUri('spotify:trak:7MZyREIMPkkg7cwzzACw67')).toBeNull();
    });
});
