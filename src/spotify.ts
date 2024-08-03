import { parse } from 'node-html-parser';

export type SpotifyTrackScrapeResult = {
    title: string;
    author: string;
};

export const getSpotifyTrackInfoByUrl = async (url: string): Promise<SpotifyTrackScrapeResult | null> => {
    const res = await fetch(url);
    if (!res.ok) {
        if (res.status === 404) {
            return null;
        }

        throw new Error('request returned non-200 response: ' + res.statusText);
    }

    const document = parse(await res.text());
    const title = document.querySelector('meta[property="og:title"]')?.getAttribute('content');
    if (!title) {
        throw new Error('unable to find song title');
    }

    const author = document.querySelector('meta[name="music:musician_description"]')?.getAttribute('content');
    if (!author) {
        throw new Error('unable to find author');
    }

    return {
        title,
        author,
    };
};

export const isSpotifyTrackURL = (url: string) => {
    if (!URL.canParse(url)) {
        return false;
    }

    const parsed = new URL(url);
    return parsed.host === 'open.spotify.com' && parsed.pathname.startsWith('/track/');
};
