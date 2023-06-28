import { AudioResource, createAudioResource } from '@discordjs/voice';
import { Snowflake } from 'discord.js';
import ytdl from 'ytdl-core';
import logger from './logger';
import { ytdlRequestOptions } from './config';

export type CreateAudioResource = () => Promise<AudioResource>;
export type Track = {
    title?: string;
    author?: string;
    url?: string;
    durationSeconds?: number;
    addedBy?: Snowflake;
    createAudioResource: CreateAudioResource;
};

export const createCreateYTDLAudioResource: (
    videoUrl: string
) => CreateAudioResource = (videoUrl) => async () => {
    const stream = ytdl(videoUrl, {
        highWaterMark: 1 << 25,
        filter: 'audioonly',
        quality: 'highestaudio',
        requestOptions: ytdlRequestOptions,
    });

    stream.on('error', (err) => {
        logger.error('YTDL Stream error', err);
    });

    return createAudioResource(stream);
};
