import chalk from 'chalk';
type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'DEBUG';
type Logger = Record<Lowercase<LogLevel>, (...messages: Array<any>) => void>;

const LOG_LEVEL_LABELS: Readonly<Record<LogLevel, string>> = {
    INFO: chalk.greenBright('INFO'),
    WARN: chalk.yellow('WARN'),
    ERROR: chalk.redBright('ERROR'),
    FATAL: chalk.red('FATAL'),
    DEBUG: chalk.magenta('DEBUG'),
};

const log = (logLevel: LogLevel, messages: Array<any>): void => {
    console.log(
        chalk.grey(new Date().toISOString()),
        LOG_LEVEL_LABELS[logLevel],
        '---',
        ...messages
    );
};

const logger = (Object.keys(LOG_LEVEL_LABELS) as Array<LogLevel>).reduce(
    (current, logLevel) => {
        current[logLevel.toLowerCase() as Lowercase<LogLevel>] = (
            ...messages
        ) => log(logLevel, messages);
        return current;
    },
    {} as Logger
);

const debugLogFn = logger.debug;

logger.debug = (...args) => {
    if (require('./config').environment === 'development') {
        return;
    }
    debugLogFn(...args);
};

export default logger as Readonly<Logger>;
