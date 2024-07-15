import chalk from 'chalk';
import config from './config.js';

const FORMATTED_LOG_LEVEL = {
    INFO: chalk.greenBright('INFO'),
    WARN: chalk.yellow('WARN'),
    ERROR: chalk.redBright('ERROR'),
    DEBUG: chalk.magenta('DEBUG'),
};

class Logger {
    public info(...args: unknown[]) {
        this.log(FORMATTED_LOG_LEVEL.INFO, args);
    }

    public warn(...args: unknown[]) {
        this.log(FORMATTED_LOG_LEVEL.WARN, args);
    }

    public error(...args: unknown[]) {
        this.log(FORMATTED_LOG_LEVEL.ERROR, args);
    }

    public debug(...args: unknown[]) {
        if (config.debug) {
            this.log(FORMATTED_LOG_LEVEL.DEBUG, args);
        }
    }

    private log(formattedLogLevel: string, args: unknown[]) {
        console.log(`${new Date().toISOString()}\t${formattedLogLevel}\t`, ...args);
    }
}

const logger = new Logger();

// TODO: not as global logger
export default logger;
