const PRIMARY_HOSTNAMES = ['www.youtube.com', 'youtube.com', 'm.youtube.com'];
const SHARE_HOSTNAMES = ['www.youtu.be', 'youtu.be'];
const MUSIC_HOSTNAMES = ['music.youtube.com'];

// pages with the video id as segment in path
const VIDEO_ID_PATHNAME_PREFIXES = ['/shorts/', '/live/', '/embed/'];

export class YoutubeUrlReader {
    readonly #url: URL;

    public constructor(url: URL) {
        this.#url = url;
    }

    public get isPrimaryHost() {
        return PRIMARY_HOSTNAMES.includes(this.#url.hostname);
    }

    public get isShareHost() {
        return SHARE_HOSTNAMES.includes(this.#url.hostname);
    }

    public get isMusicHost() {
        return MUSIC_HOSTNAMES.includes(this.#url.hostname);
    }

    public get isWatchPage() {
        return this.#url.pathname === '/watch';
    }

    public get isVideoIdPathPage() {
        return this.#videoIdPathnamePrefix !== null;
    }

    public get isPlaylistPage() {
        return this.#url.pathname === '/playlist';
    }

    public get isPrimarySearchResultPage() {
        return this.#url.pathname === '/results';
    }

    public get isMusicSearchResultPage() {
        return this.#url.pathname === '/search';
    }

    public get watchPageVideoId() {
        return this.#url.searchParams.get('v');
    }

    public get videoIdPathPageVideoId() {
        const prefix = this.#videoIdPathnamePrefix;
        if (!prefix) {
            return null;
        }

        return this.#url.pathname.substring(prefix.length);
    }

    public get playlistPagePlaylistId() {
        return this.#url.searchParams.get('list');
    }

    public get sharePageVideoId() {
        return this.#url.pathname.substring(1);
    }

    public get primarySearchResultPageTerm() {
        return this.#url.searchParams.get('search_query');
    }

    public get musicSearchResultPageTerm() {
        return this.#url.searchParams.get('q');
    }

    get #videoIdPathnamePrefix() {
        return VIDEO_ID_PATHNAME_PREFIXES.find((prefix) => this.#url.pathname.startsWith(prefix)) ?? null;
    }
}

export const createYoutubeWatchPageUrl = (videoId: string) =>
    `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
export const createYoutubePlaylistUrl = (playlistId: string) =>
    `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
