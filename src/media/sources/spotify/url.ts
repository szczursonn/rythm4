import { spotifyUriSchema, type SpotifyUri } from './uri.ts';

const spotifyUriInPathnameRegex =
    /^(?:\/intl-[a-zA-Z]{2}(?:-[a-zA-Z]{2,4})?)?\/(?<type>[a-z]+)\/(?<id>[a-zA-Z0-9]+)\/?$/;
export const urlToSpotifyUri = (url: URL) => {
    if (url.protocol !== 'https:' || url.hostname !== 'open.spotify.com') {
        return null;
    }

    return spotifyUriSchema.safeParse(spotifyUriInPathnameRegex.exec(url.pathname)?.groups).data ?? null;
};

export const urlStringToSpotifyUri = (urlString: string) => {
    const url = URL.parse(urlString);
    return url ? urlToSpotifyUri(url) : null;
};

export const createSpotifyUrl = (uri: SpotifyUri, { embed = false }: { embed?: boolean } = {}) =>
    `https://open.spotify.com${embed ? '/embed' : ''}/${uri.type}/${uri.id}`;
