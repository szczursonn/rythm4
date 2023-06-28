import 'dotenv/config';
import logger from './logger';

const DEFAULT_PREFIX = '$';

type Config = {
    discordToken: string;
    prefix: string;
    youtubeCookie: string | undefined;
    youtubeToken: string | undefined;
    environment: 'development' | 'production';
};

if (!process.env.DISCORD_TOKEN) {
    logger.error('Discord Token [DISCORD_TOKEN] not provided, shutting down');
    process.exit();
}

if (!process.env.PREFIX) {
    logger.warn(`Prefix [PREFIX] not provided, defaulted to ${DEFAULT_PREFIX}`);
}

if (!process.env.YT_COOKIE) {
    logger.warn(
        'Youtube cookie [YT_COOKIE] not provided, age restricted videos may not work'
    );
}

if (!process.env.YT_TOKEN) {
    logger.warn(
        'Youtube identity token [YT_TOKEN] not provided, age restricted videos may not work'
    );
}

const config: Config = {
    discordToken: process.env.DISCORD_TOKEN,
    prefix: process.env.PREFIX || DEFAULT_PREFIX,
    youtubeCookie: process.env.YT_COOKIE,
    youtubeToken: process.env.YT_TOKEN,
    environment:
        process.env.NODE_ENV === 'production' ? 'production' : 'development',
};

export default config;

export const ytdlRequestOptions: { headers: Record<string, string> } = {
    headers: {},
};

if (config.youtubeCookie) {
    ytdlRequestOptions.headers.cookie = config.youtubeCookie;
}

if (config.youtubeToken) {
    ytdlRequestOptions.headers['X-Youtube-Identity-Token'] =
        config.youtubeToken;
}
