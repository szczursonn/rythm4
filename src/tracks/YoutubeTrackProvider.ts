import { Readable } from 'node:stream';
import Innertube, { ClientType, UniversalCache, type YT, YTNodes } from 'youtubei.js';
import { createAudioResource } from '@discordjs/voice';
import type {
    TrackProvider,
    Track,
    TrackProviderQueryResult,
    AutocompleteTrackProviderQueryResult,
} from './TrackManager.ts';

const SEARCH_ITEM_TYPES = {
    VIDEO: ['song', 'video'] as YTNodes.MusicResponsiveListItem['item_type'][],
    PLAYLIST: ['playlist', 'album'] as YTNodes.MusicResponsiveListItem['item_type'][],
} as const;

const YT_SHORTS_PATHNAME = '/shorts/';

export class YoutubeTrackProvider implements TrackProvider {
    public static async create({ cookie, cachePath }: { cookie: string | undefined; cachePath: string }) {
        const innertube = await Innertube.create({
            client_type: ClientType.MUSIC,
            cache: new UniversalCache(true, cachePath),
            cookie,
        });

        return new this(innertube);
    }

    private constructor(private readonly innertube: Innertube) {}

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

        const sections = await this.innertube.music.getSearchSuggestions(query);
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
        const videoInfo = await this.innertube.getBasicInfo(videoId);
        return new YoutubeTrack(videoInfo);
    }

    public async getTrackBySearch(query: string) {
        const searchResponse = await this.innertube.music.search(query);
        const searchResults = this.extractResultsFromSearchResponseNodes(searchResponse.contents ?? []);

        if (searchResults.length === 0) {
            return null;
        }

        return this.getTrackById(searchResults[0]!.id);
    }

    private async getTracksByPlaylistId(playlistId: string) {
        const playlistResponses = [await this.innertube.getPlaylist(playlistId)];
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
                tracks.push(new YoutubeLazyTrack(this, node.id, node.title, 0, null));
            }
        }

        return tracks;
    }
}

class YoutubeTrack implements Track {
    public constructor(public readonly videoInfo: YT.VideoInfo) {}

    get title() {
        return this.videoInfo.basic_info.title ?? '';
    }

    get durationSeconds() {
        return this.videoInfo.basic_info.duration ?? null;
    }

    get url() {
        return (
            this.videoInfo.basic_info.url_canonical ??
            (this.videoInfo.basic_info.id ? createVideoURL(this.videoInfo.basic_info.id) : null)
        );
    }

    get authorName() {
        return this.videoInfo.basic_info.channel?.name ?? this.videoInfo.basic_info.author ?? null;
    }

    async createAudioResource() {
        const webStream = await this.videoInfo.download({
            type: 'audio',
        });

        // @ts-expect-error
        const stream = Readable.fromWeb(webStream);

        return {
            audioResource: createAudioResource(stream),
            resolvedTrack: this,
        };
    }
}

class YoutubeLazyTrack implements Track {
    public constructor(
        public readonly provider: YoutubeTrackProvider,
        public readonly videoId: string,
        public readonly title: string,
        public readonly durationSeconds: number,
        public readonly authorName: string | null
    ) {}

    get url() {
        return createVideoURL(this.videoId);
    }

    async createAudioResource() {
        const resolvedTrack = await this.provider.getTrackById(this.videoId);
        return resolvedTrack.createAudioResource();
    }
}

const createVideoURL = (videoId: string) => `https://www.youtube.com/watch?v=${videoId}`;
const createPlaylistURL = (playlistId: string) => `https://youtube.com/playlist?list=${playlistId}`;
