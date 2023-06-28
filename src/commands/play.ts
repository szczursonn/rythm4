import { StageChannel, VoiceChannel } from 'discord.js';
import { Command } from '.';
import ytfps from 'ytfps';
import { getInfo } from 'ytdl-core';
import logger from '../logger';
import ytsearch from 'yt-search';
import { createCreateYTDLAudioResource } from '../Track';
import { SessionInitializationError } from '../Session';
import { ytdlRequestOptions } from '../config';

const play: Command = {
    name: 'Play',
    aliases: ['play', 'p'],
    description: 'Adds a song to the queue',
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
    async handler({ bot, args, sender, reply }) {
        const voiceChannel = sender.voice.channel;
        if (voiceChannel instanceof StageChannel) {
            await reply(
                ':no_entry_sign: **Support for stage channels not implemented yet!**'
            );
            return;
        }
        if (!(voiceChannel instanceof VoiceChannel)) {
            await reply(
                ':x: **You have to be in a voice channel to use this command!**'
            );
            return;
        }

        const query = args.join(' ');
        if (query.length < 1) {
            await reply(
                ':x: **You must provide a youtube video/playlist link or a searchphrase!**'
            );
            return;
        }

        let session = bot.sessions.get(sender.guild.id);
        if (!session) {
            try {
                session = bot.sessions.start(voiceChannel);
            } catch (err) {
                if (err instanceof SessionInitializationError) {
                    switch (err.type) {
                        case 'missing_permissions_connect':
                            await reply(
                                ":x: **I don't have permission to connect to voice channel**"
                            );
                            return;
                        case 'missing_permissions_speak':
                            await reply(
                                ":x: **I don't have permission to speak in the voice channel**"
                            );
                            return;
                    }
                }
                await reply(':x: **Unknown error when joining voice channel**');

                return;
            }
        }

        try {
            if (query.includes('/playlist')) {
                // might be a playlist link
                const youtubePlaylist = await ytfps(query);
                for (const video of youtubePlaylist.videos) {
                    session.enqueue({
                        title: video.title,
                        author: video.author.name,
                        url: video.url,
                        durationSeconds: Math.round(video.milis_length / 1000),
                        addedBy: sender.id,
                        createAudioResource: createCreateYTDLAudioResource(
                            video.url
                        ),
                    });
                }

                const unaccessibleVideosCount =
                    youtubePlaylist.video_count - youtubePlaylist.videos.length;

                reply(
                    `:notes: **Added ${
                        youtubePlaylist.videos.length
                    } videos to the queue!${
                        unaccessibleVideosCount !== 0
                            ? ` ${unaccessibleVideosCount} videos were not accessible.`
                            : ''
                    }**`
                );
                return;
            } else if (query.startsWith('http')) {
                // a link to a youtube video
                const videoInfo = await getInfo(query, {
                    requestOptions: ytdlRequestOptions,
                });
                session.enqueue({
                    title: videoInfo.videoDetails.title,
                    author: videoInfo.videoDetails.author.name,
                    url: videoInfo.videoDetails.video_url,
                    durationSeconds: parseInt(
                        videoInfo.videoDetails.lengthSeconds
                    ),
                    addedBy: sender.id,
                    createAudioResource: createCreateYTDLAudioResource(
                        videoInfo.videoDetails.video_url
                    ),
                });
                reply(
                    `:notes: **Added \`${videoInfo.videoDetails.title}\` to the queue!**`
                );
                return;
            } else {
                // search for youtube video
                const video = (await ytsearch(query)).videos?.[0];

                if (video) {
                    session.enqueue({
                        title: video.title,
                        author: video.author.name,
                        url: video.url,
                        durationSeconds: video.duration.seconds,
                        addedBy: sender.id,
                        createAudioResource: createCreateYTDLAudioResource(
                            video.url
                        ),
                    });
                    reply(`:notes: **Added \`${video.title}\` to the queue!**`);
                    return;
                }

                throw new Error('YT Search returned 0 results');
            }
        } catch (err) {
            if (String(err).includes('410')) {
                await reply(':octagonal_sign: **Video is age-restricted**');
                return;
            }
            logger.debug(`Find video error: `, err);
            await reply(':octagonal_sign: **I was unable to find the video**');
        }
    },
};

export default play;
