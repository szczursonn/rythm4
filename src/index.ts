import { MusicBot } from './bot/MusicBot.js';
import config from './config.js';
import logger from './logger.js';

const exit = (code?: Parameters<typeof process.exit>[0]) => {
    // allow stdout to be flushed so logs dont bleed over
    setTimeout(() => process.exit(code), 50);
};

logger.info(`Starting bot, prefix: ${config.prefix}`);
logger.info('To stop the bot, press CTRL+C');
if (config.debug) {
    logger.debug('Debug mode enabled');
}

const bot = new MusicBot({ prefix: config.prefix, adminId: config.adminId });

process.once('SIGINT', () => {
    logger.info('Shutting down...');

    // Process should be killed by disconnect callback - in case something goes horribly wrong time out instead
    setTimeout(() => exit(), 3_000);

    bot.stop();
});

try {
    await bot.start(config.discordToken);

    bot.waitForDisconnect().then(() => {
        logger.info('Bot has disconnected');
        exit();
    });
} catch (err) {
    logger.error('Failed to start bot', err);
    exit(-1);
}
