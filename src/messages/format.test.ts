import { describe, it, expect } from 'vitest';
import { formatHHMMSSDuration, formatTrackLink } from './format.ts';

describe('formatTrackLink', () => {
    it('creates a markdown link when there is a url', () => {
        expect(formatTrackLink({ title: 'Song', webPageUrl: 'https://example.com' })).toBe(
            '[Song](https://example.com)',
        );
    });

    it('falls back to the title', () => {
        expect(formatTrackLink({ title: 'Song', webPageUrl: null })).toBe('Song');
        expect(formatTrackLink({ title: null, webPageUrl: null })).toBe('<unknown>');
    });

    it('escapes markdown in the title', () => {
        expect(formatTrackLink({ title: '*bold*', webPageUrl: null })).toBe('\\*bold\\*');
    });
});

describe('formatHHMMSSDuration', () => {
    it('formats durations under an hour as mm:ss', () => {
        expect(formatHHMMSSDuration(0)).toBe('00:00');
        expect(formatHHMMSSDuration(5_000)).toBe('00:05');
        expect(formatHHMMSSDuration(65_000)).toBe('01:05');
        expect(formatHHMMSSDuration(59 * 60_000 + 59_000)).toBe('59:59');
    });

    it('formats durations of an hour or more as h:mm:ss', () => {
        expect(formatHHMMSSDuration(60 * 60_000)).toBe('1:00:00');
        expect(formatHHMMSSDuration(25 * 60 * 60_000 + 61_000)).toBe('25:01:01');
    });

    it('rounds to whole seconds', () => {
        expect(formatHHMMSSDuration(1_499)).toBe('00:01');
        expect(formatHHMMSSDuration(1_500)).toBe('00:02');
    });
});
