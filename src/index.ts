import { MusicBot } from './MusicBot';
import config from './config';
import logger from './logger';

logger.info(
    `Starting app, enviroment: ${config.environment}, prefix: ${config.prefix}`
);
new MusicBot();
