import { YTNodes, type ClientType } from 'youtubei.js';
import * as z from 'zod';
import type { Logger } from '../../../logger/logger.ts';
import type { MatchTrackSource, SearchTrackSource, SearchSuggestionsSource } from '../../media.ts';
import { YoutubeIdentityManager } from './identityManager.ts';
import { isPlayabilityStatusReasonBotCheck } from './detectBotCheck.ts';
import { YoutubeUrlReader } from './url.ts';
import { YoutubeLazyTrack, YoutubeTrack } from './track.ts';
import { YoutubePlaylist } from './playlist.ts';

const navigationEndpointPayloadSchema = z.object({
    videoId: z.string(),
});

const MAX_PLAYLIST_CHUNKS = 5;

export class YoutubeTrackSource implements MatchTrackSource, SearchTrackSource, SearchSuggestionsSource {
    readonly #identityManager: YoutubeIdentityManager;

    public constructor({
        logger,
        clientType,
        playerIdOverride,
        cookie,
        sessionMaxAgeMs,
        cacheDirPath,
        poTokenEnabled,
    }: {
        readonly logger: Logger;
        readonly clientType: ClientType;
        readonly playerIdOverride?: string;
        readonly cookie?: string;
        readonly sessionMaxAgeMs: number;
        readonly cacheDirPath: string;
        readonly poTokenEnabled: boolean;
    }) {
        this.#identityManager = new YoutubeIdentityManager({
            clientType,
            playerIdOverride,
            cookie,
            maxAgeMs: sessionMaxAgeMs,
            cacheDirPath,
            poTokenEnabled,
            logger: logger.withModule('identity'),
        });
    }

    public match(query: string) {
        const url = URL.parse(query);
        if (!url) {
            return null;
        }

        const ytUrl = new YoutubeUrlReader(url);

        if (ytUrl.isPrimaryHost) {
            if (ytUrl.isWatchPage) {
                return this.#tryCreateVideoMatch(ytUrl.watchPageVideoId);
            }
            if (ytUrl.isVideoIdPathPage) {
                return this.#tryCreateVideoMatch(ytUrl.videoIdPathPageVideoId);
            }
            if (ytUrl.isPlaylistPage) {
                return this.#tryCreatePlaylistMatch(ytUrl.playlistPagePlaylistId);
            }
            if (ytUrl.isPrimarySearchResultPage) {
                return this.#tryCreateSearchMatch(ytUrl.primarySearchResultPageTerm);
            }
        }

        if (ytUrl.isShareHost) {
            return this.#tryCreateVideoMatch(ytUrl.sharePageVideoId);
        }

        if (ytUrl.isMusicHost) {
            if (ytUrl.isWatchPage) {
                return this.#tryCreateVideoMatch(ytUrl.watchPageVideoId);
            }
            if (ytUrl.isPlaylistPage) {
                return this.#tryCreatePlaylistMatch(ytUrl.playlistPagePlaylistId);
            }
            if (ytUrl.isMusicSearchResultPage) {
                return this.#tryCreateSearchMatch(ytUrl.musicSearchResultPageTerm);
            }
        }

        return null;
    }

    public async search(term: string) {
        const identity = await this.#identityManager.getCachedIdentity();
        const result = await identity.runWithBotCheckInvalidation(() => identity.innertube.music.search(term));

        for (const node of result.contents ?? []) {
            if (node.is(YTNodes.MusicCardShelf)) {
                const videoId = navigationEndpointPayloadSchema.safeParse(node.title.endpoint?.payload).data?.videoId;
                if (!videoId) {
                    continue;
                }

                return new YoutubeLazyTrack(this, {
                    videoId,
                    title: node.title.toString(),
                    durationMs: null,
                });
            }

            if (node.is(YTNodes.ItemSection)) {
                for (const listItemNode of node.contents) {
                    if (
                        !listItemNode.is(YTNodes.MusicResponsiveListItem) ||
                        !listItemNode.id ||
                        (listItemNode.item_type !== 'song' && listItemNode.item_type !== 'video')
                    ) {
                        continue;
                    }

                    return new YoutubeLazyTrack(this, {
                        videoId: listItemNode.id,
                        title: listItemNode.title ?? null,
                        durationMs: listItemNode.duration?.seconds ? listItemNode.duration.seconds * 1000 : null,
                    });
                }
            }
        }

        return null;
    }

    public async suggest(query: string) {
        const identity = await this.#identityManager.getCachedIdentity();
        return identity.runWithBotCheckInvalidation(() => identity.innertube.getSearchSuggestions(query));
    }

    public async getTrackById(videoId: string) {
        const identity = await this.#identityManager.getCachedIdentity();
        const videoPoToken = await identity.tryMint(videoId);
        const info = await identity.runWithBotCheckInvalidation(() =>
            identity.innertube.getBasicInfo(videoId, { po_token: videoPoToken }),
        );

        if (info.playability_status?.status !== 'OK') {
            if (isPlayabilityStatusReasonBotCheck(info.playability_status?.reason)) {
                identity.invalidate();
            }

            throw new Error(
                `Video "${videoId}" reported as unplayable: ${info.playability_status?.status} (${info.playability_status?.reason})`,
            );
        }

        return new YoutubeTrack(this, { videoId, identity, info, videoPoToken });
    }

    async #getPlaylistById(playlistId: string) {
        const identity = await this.#identityManager.getCachedIdentity();
        const playlistInfos = await identity.runWithBotCheckInvalidation(async () => {
            const infos = [await identity.innertube.getPlaylist(playlistId)];
            while (infos.length < MAX_PLAYLIST_CHUNKS) {
                const mostRecentInfo = infos.at(-1)!;
                if (!mostRecentInfo.has_continuation) {
                    break;
                }
                infos.push(await mostRecentInfo.getContinuation());
            }
            return infos;
        });

        const tracks: YoutubeLazyTrack[] = [];

        for (const playlistInfo of playlistInfos) {
            for (const node of playlistInfo.videos) {
                if (!node.is(YTNodes.PlaylistVideo)) {
                    continue;
                }

                tracks.push(
                    new YoutubeLazyTrack(this, {
                        videoId: node.id,
                        title: node.title.toString(),
                        durationMs: node.duration.seconds ? node.duration.seconds * 1000 : null,
                    }),
                );
            }
        }

        return new YoutubePlaylist({
            playlistId,
            title: playlistInfos[0]!.info.title ?? null,
            tracks,
        });
    }

    #tryCreateVideoMatch(videoId: string | null | undefined) {
        if (!videoId) {
            return null;
        }

        return {
            type: 'track',
            resolve: () => this.getTrackById(videoId),
        } as const;
    }

    #tryCreatePlaylistMatch(playlistId: string | null | undefined) {
        if (!playlistId) {
            return null;
        }

        return {
            type: 'collection',
            resolve: () => this.#getPlaylistById(playlistId),
        } as const;
    }

    #tryCreateSearchMatch(term: string | null | undefined) {
        if (!term) {
            return null;
        }

        return {
            type: 'search',
            term,
            resolve: () => this.search(term),
        } as const;
    }
}
