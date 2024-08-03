import { VoiceChannel } from 'discord.js';
import ytdl from '@distube/ytdl-core';
import ytsearch from 'yt-search';
import ytpl from '@distube/ytpl';
import scdl from 'soundcloud-downloader';
import { CommandHandlerMessageContext, ICONS, type Command } from './index.js';
import { Track } from '../Session.js';
import { getSpotifyTrackInfoByUrl, isSpotifyTrackURL } from '../../spotify.js';

const play: Command = {
    name: 'Play',
    aliases: ['play', 'p'],
    description: 'Adds a song to the queue from Youtube or Soundcloud',
    icon: '⏯️',
    visibility: 'public',
    interactionArguments: [
        {
            name: 'song',
            description: 'Video name or Youtube Video/Playlist URL',
            type: 3,
            required: true,
        },
    ],
    async handler(ctx) {
        if (!(ctx.userVoiceChannel instanceof VoiceChannel)) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **You have to be in a voice channel to use this command!**`,
                ephemeral: true,
            });
        }

        const query =
            ctx instanceof CommandHandlerMessageContext
                ? ctx.args
                : ctx.interaction.options.get('song')?.value?.toString() ?? '';

        if (query.length === 0) {
            return ctx.reply({
                text: `${ICONS.USER_ERROR} **You must provide a youtube video/playlist link or a searchphrase!**`,
                ephemeral: true,
            });
        }

        ctx.reply({
            defer: true,
        });

        const session = ctx.bot.getOrCreateSession(ctx.userVoiceChannel, ctx.channel);

        let tracksToAdd: Track[];

        if (URL.canParse(query)) {
            ctx.reply({
                text: ':beers: **Checking the url...**',
            });

            if (ytdl.validateURL(query)) {
                try {
                    const videoInfo = await ytdl.getInfo(query);

                    tracksToAdd = [
                        {
                            title: videoInfo.videoDetails.title,
                            author: videoInfo.videoDetails.author.name,
                            authorUrl: videoInfo.videoDetails.author.channel_url,
                            url: videoInfo.videoDetails.video_url,
                            durationSeconds: parseInt(videoInfo.videoDetails.lengthSeconds) || 0,
                            addedBy: ctx.user.id,
                            type: 'youtube',
                        },
                    ];
                } catch (err) {
                    const errString = String(err);

                    if (errString.includes('private video')) {
                        return ctx.reply({
                            text: `${ICONS.USER_ERROR} **This is a private video**`,
                        });
                    }

                    if (errString.includes('Sign in')) {
                        return ctx.reply({
                            text: `${ICONS.USER_ERROR} **Video is age restricted**`,
                        });
                    }

                    if (errString.includes('unavailable')) {
                        return ctx.reply({
                            text: `${ICONS.USER_ERROR} **Video does not exist**`,
                        });
                    }

                    throw err;
                }
            } else if (ytpl.validateID(query)) {
                try {
                    const playlist = await ytpl(query);

                    if (playlist.items.length === 0) {
                        return ctx.reply({
                            text: `${ICONS.USER_ERROR} **The playlist is empty**`,
                        });
                    }

                    tracksToAdd = playlist.items.map((item) => ({
                        title: item.title,
                        author: item.author?.name ?? 'Unknown',
                        authorUrl: item.author?.ref,
                        url: item.url,
                        durationSeconds: parseInt(item.duration || ''),
                        addedBy: ctx.user.id,
                        type: 'youtube' as const,
                    }));
                } catch (err) {
                    throw err;
                }
            } else if (scdl.default.isValidUrl(query)) {
                if (scdl.default.isPlaylistURL(query)) {
                    return ctx.reply({
                        text: `${ICONS.USER_ERROR} **Soundcloud playlists are not supported**`,
                    });
                }
                try {
                    const soundcloudTrack = await scdl.default.getInfo(query);

                    tracksToAdd = [
                        {
                            title: soundcloudTrack.title ?? 'Unknown',
                            author: soundcloudTrack.user?.username ?? 'Unknown',
                            authorUrl: soundcloudTrack.user?.permalink_url,
                            url: soundcloudTrack.permalink_url ?? query,
                            durationSeconds: (soundcloudTrack.full_duration ?? soundcloudTrack.duration ?? 0) / 1000,
                            addedBy: ctx.user.id,
                            type: 'soundcloud',
                        },
                    ];
                } catch (err) {
                    const errString = String(err);

                    if (errString.includes('404')) {
                        return ctx.reply({
                            text: `${ICONS.USER_ERROR} **This track does not exist**`,
                        });
                    }

                    throw err;
                }
            } else if (isSpotifyTrackURL(query)) {
                const spotifyInfo = await getSpotifyTrackInfoByUrl(query);

                if (!spotifyInfo) {
                    return ctx.reply({
                        text: `${ICONS.USER_ERROR} **There is not such spotify track**`,
                    });
                }

                ctx.reply({
                    text: ':beers: **Searching for a matching youtube video...**',
                });
                const searchResult = await ytsearch(`${spotifyInfo.author} ${spotifyInfo.title} audio`);
                const video = searchResult.videos[0];

                if (!video) {
                    return ctx.reply({
                        text: `${ICONS.USER_ERROR} **Could not find a youtube video for the spotify track**`,
                    });
                }

                tracksToAdd = [
                    {
                        title: video.title,
                        author: video.author.name,
                        authorUrl: video.author.url,
                        url: video.url,
                        durationSeconds: video.duration.seconds,
                        addedBy: ctx.user.id,
                        type: 'youtube',
                    },
                ];
            } else {
                return ctx.reply({
                    text: `${ICONS.USER_ERROR} **Invalid URL**`,
                    ephemeral: true,
                });
            }
        } else {
            ctx.reply({
                text: ':beers: **Searching for youtube video...**',
            });
            const searchResult = await ytsearch(query);
            const video = searchResult.videos[0];

            if (!video) {
                return ctx.reply({
                    text: `${ICONS.USER_ERROR} **Could not find the video**`,
                });
            }

            tracksToAdd = [
                {
                    title: video.title,
                    author: video.author.name,
                    authorUrl: video.author.url,
                    url: video.url,
                    durationSeconds: video.duration.seconds,
                    addedBy: ctx.user.id,
                    type: 'youtube',
                },
            ];
        }

        session.enqueue(...tracksToAdd);

        if (tracksToAdd.length === 1) {
            return ctx.reply({
                text: `:notes: **Added [${tracksToAdd[0]!.title}](${tracksToAdd[0]!.url}) to the queue!**`,
            });
        } else {
            return ctx.reply({
                text: `:notes: **Added ${tracksToAdd.length} videos to the queue!**`,
            });
        }
    },
};

export default play;
