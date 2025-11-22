import { resolve } from 'node:path';
import Innertube, { ClientType, Platform, type Types, UniversalCache, YTNodes } from 'youtubei.js';
import type {
    AutocompleteTrackProviderQueryResult,
    Track,
    TrackProvider,
    TrackProviderQueryResult,
} from '../TrackManager.ts';
import { LazyYoutubeTrack, YoutubeTrack } from './tracks.ts';
import { createPlaylistURL, createVideoURL } from './urls.ts';

const SEARCH_ITEM_TYPES = {
    VIDEO: ['song', 'video'] as YTNodes.MusicResponsiveListItem['item_type'][],
    PLAYLIST: ['playlist', 'album'] as YTNodes.MusicResponsiveListItem['item_type'][],
} as const;

const YT_SHORTS_PATHNAME = '/shorts/';

export class YoutubeTrackProvider implements TrackProvider {
    private static isEvalInitialized = false;

    public static async create({
        cookie,
        playerIdOverride,
        cachePath,
    }: {
        cookie?: string;
        playerIdOverride?: string;
        cachePath: string;
    }) {
        if (!this.isEvalInitialized) {
            Platform.shim.eval = unsafeEval;

            this.isEvalInitialized = true;
        }

        // video/playlist info: WEB (TV is missing most data like video title)
        // streaming: TV (WEB doesn't work)
        // search, search suggestions: MUSIC (better results quality than YT proper)

        const [infoInnertube, streamInnertube, musicInnertube] = await Promise.all([
            Innertube.create({
                client_type: ClientType.WEB,
                cache: new UniversalCache(true, resolve(cachePath, ClientType.WEB)),
                cookie,
                player_id: playerIdOverride,
            }),
            Innertube.create({
                client_type: ClientType.TV,
                cache: new UniversalCache(true, resolve(cachePath, ClientType.TV)),
                cookie,
                player_id: playerIdOverride,
            }),
            Innertube.create({
                client_type: ClientType.MUSIC,
                cache: new UniversalCache(true, resolve(cachePath, ClientType.MUSIC)),
                cookie,
                player_id: playerIdOverride,
            }),
        ]);

        return new this(infoInnertube, streamInnertube, musicInnertube);
    }

    private constructor(
        public readonly infoInnertube: Innertube,
        public readonly streamInnertube: Innertube,
        public readonly musicInnertube: Innertube
    ) {}

    public async handleQuery(query: string | URL): Promise<TrackProviderQueryResult> {
        if (!(query instanceof URL)) {
            const track = await this.getTrackBySearch(query);

            if (track === null) {
                return null;
            }

            return {
                type: 'track',
                track,
            };
        }

        if (query.hostname === 'www.youtube.com' || query.hostname === 'music.youtube.com') {
            if (query.pathname === '/watch') {
                const videoId = query.searchParams.get('v');
                if (!videoId) {
                    return null;
                }

                return {
                    type: 'track',
                    track: await this.getTrackById(videoId),
                };
            }

            if (query.pathname.startsWith(YT_SHORTS_PATHNAME)) {
                const videoId = query.pathname.substring(YT_SHORTS_PATHNAME.length);
                if (!videoId) {
                    return null;
                }

                return {
                    type: 'track',
                    track: await this.getTrackById(videoId),
                };
            }

            if (query.pathname === '/playlist') {
                const playlistId = query.searchParams.get('list');
                if (!playlistId) {
                    return null;
                }

                return {
                    type: 'set',
                    ...(await this.getTracksByPlaylistId(playlistId)),
                };
            }

            return null;
        }

        if (query.hostname === 'www.youtu.be' || query.hostname === 'youtu.be') {
            const videoId = query.pathname.substring(1);
            if (!videoId) {
                return null;
            }

            return {
                type: 'track',
                track: await this.getTrackById(videoId),
            };
        }

        return null;
    }

    public async handleAutocompleteQuery(query: string): Promise<AutocompleteTrackProviderQueryResult[]> {
        const results = [] as AutocompleteTrackProviderQueryResult[];

        const sections = await this.musicInnertube.music.getSearchSuggestions(query);
        for (const section of sections) {
            for (const sectionItem of section.contents) {
                if (
                    sectionItem instanceof YTNodes.SearchSuggestion ||
                    sectionItem instanceof YTNodes.HistorySuggestion
                ) {
                    results.push({
                        type: 'text',
                        text: sectionItem.suggestion.toString(),
                    });
                } else if (sectionItem instanceof YTNodes.MusicResponsiveListItem) {
                    if (
                        SEARCH_ITEM_TYPES.VIDEO.includes(sectionItem.item_type) &&
                        sectionItem.id &&
                        sectionItem.title
                    ) {
                        if (SEARCH_ITEM_TYPES.VIDEO.includes(sectionItem.item_type)) {
                            results.push({
                                type: 'track',
                                url: createVideoURL(sectionItem.id),
                                title: sectionItem.title,
                            });
                        } else if (SEARCH_ITEM_TYPES.PLAYLIST.includes(sectionItem.item_type)) {
                            results.push({
                                type: 'set',
                                url: createVideoURL(sectionItem.id),
                                title: sectionItem.title,
                            });
                        }
                    }
                }
            }
        }

        return results;
    }

    public async getTrackById(videoId: string) {
        const [videoInfo, videoInfoForStream] = await Promise.all([
            this.infoInnertube.getBasicInfo(videoId),
            this.streamInnertube.getBasicInfo(videoId),
        ]);

        return new YoutubeTrack(this, videoInfo, videoInfoForStream);
    }

    public async getTrackBySearch(query: string) {
        const searchResponse = await this.musicInnertube.music.search(query);
        const searchResults = this.extractResultsFromSearchResponseNodes(searchResponse.contents ?? []);

        if (searchResults.length === 0) {
            return null;
        }

        return this.getTrackById(searchResults[0]!.id);
    }

    private async getTracksByPlaylistId(playlistId: string) {
        const playlistResponses = [await this.infoInnertube.getPlaylist(playlistId)];
        while (playlistResponses.at(-1)!.has_continuation) {
            playlistResponses.push(await playlistResponses.at(-1)!.getContinuation());
        }

        const tracks = [] as Track[];

        for (const playlistResponse of playlistResponses) {
            if (playlistResponse.secondary_contents instanceof YTNodes.SectionList) {
                for (const node of playlistResponse.secondary_contents.contents) {
                    if (node instanceof YTNodes.MusicPlaylistShelf) {
                        tracks.push(...this.extractPlaylistTracksFromNodes(node.contents));
                    }
                }
            }

            for (const action of playlistResponse.page.on_response_received_actions ?? []) {
                if (action instanceof YTNodes.AppendContinuationItemsAction) {
                    tracks.push(...this.extractPlaylistTracksFromNodes(action.contents ?? []));
                }
            }
        }

        return {
            // TODO
            title: playlistResponses[0]!.info.title ?? playlistResponses[0]!.info.subtitle?.toString() ?? null,
            url: createPlaylistURL(playlistId),
            tracks,
        };
    }

    private extractResultsFromSearchResponseNodes(nodes: unknown[]) {
        const results = [] as {
            id: string;
            title: string;
            type: NonNullable<YTNodes.MusicResponsiveListItem['item_type']> | 'top';
        }[];

        for (const node of nodes) {
            if (node instanceof YTNodes.ItemSection) {
                results.push(...this.extractResultsFromSearchResponseNodes(node.contents));
            } else if (node instanceof YTNodes.MusicCardShelf) {
                if (typeof node.on_tap.payload?.videoId === 'string') {
                    results.push({
                        id: node.on_tap.payload.videoId,
                        title: node.title.toString(),
                        type: 'top',
                    });
                }
                results.push(...this.extractResultsFromSearchResponseNodes(node.contents ?? []));
            } else if (node instanceof YTNodes.MusicShelf) {
                results.push(...this.extractResultsFromSearchResponseNodes(node.contents));
            } else if (node instanceof YTNodes.MusicResponsiveListItem) {
                if (node.id && node.title && node.item_type && SEARCH_ITEM_TYPES.VIDEO.includes(node.item_type)) {
                    results.push({
                        id: node.id,
                        title: node.title,
                        type: node.item_type,
                    });
                }
            }
        }

        return results;
    }

    private extractPlaylistTracksFromNodes(nodes: unknown[]) {
        const tracks = [] as Track[];

        for (const node of nodes) {
            if (node instanceof YTNodes.MusicResponsiveListItem && node.id && node.title) {
                tracks.push(new LazyYoutubeTrack(this, node.id, node.title, 0, null));
            }
        }

        return tracks;
    }
}

// TODO: THIS IS VERY UNSAFE
const unsafeEval = async (data: Types.BuildScriptResult, env: Record<string, Types.VMPrimative>) => {
    const properties = [];

    if (env.n) {
        properties.push(`n: exportedVars.nFunction("${env.n}")`);
    }

    if (env.sig) {
        properties.push(`sig: exportedVars.sigFunction("${env.sig}")`);
    }

    const code = `${data.output}\nreturn { ${properties.join(', ')} }`;

    return new Function(code)();
};
