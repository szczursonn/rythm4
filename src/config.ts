import 'dotenv/config';
import { env } from 'node:process';

const DEFAULT_PREFIX = '$';

const getEnvVariable = (name: string) => env['RYTHM4_' + name];

const discordToken = getEnvVariable('DISCORD_TOKEN');

if (!discordToken) {
    throw new Error('Missing environment variable: RYTHM4_DISCORD_TOKEN');
}

const config = {
    discordToken,
    prefix: getEnvVariable('PREFIX') || DEFAULT_PREFIX,
    debug: !!getEnvVariable('DEBUG'),
} as const;

export default config;
