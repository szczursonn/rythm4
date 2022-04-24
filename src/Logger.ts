import chalk from 'chalk'

enum LogLevel {
    INFO = 'INFO',
    ERROR = 'ERROR',
    DEBUG = 'DEBUG'
}

class Logger {
    private constructor() {}

    private static formatLabel(label: LogLevel) {
        switch (label) {
            case LogLevel.INFO:
                return chalk.bgGreen(label)
            case LogLevel.ERROR:
                return chalk.bgRed(label)
            case LogLevel.DEBUG:
                return chalk.bgMagenta(label)
        }
    }

    private static formatDate(timestamp: string) {
        return chalk.bgWhite.black(timestamp)
    }

    private static _log(msg: string, label: LogLevel) {
        const timestamp = `[${new Date().toISOString()}]`

        console.log(this.formatDate(timestamp) + ` ${this.formatLabel(label)} ${msg}`)
    }

    public static info(msg: string) {
        Logger._log(msg, LogLevel.INFO)
    }

    public static err(msg: string) {
        Logger._log(msg, LogLevel.ERROR)
    }

    public static debug(msg: string) {
        Logger._log(msg, LogLevel.DEBUG)
    }

}

export default Logger