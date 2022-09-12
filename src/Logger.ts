import chalk from 'chalk'

type LogLevel = 'INFO' | 'ERROR' | 'FATAL' | 'DEBUG'

class Logger {
    private constructor() {}

    private static colorLabel(label: LogLevel): string {
        switch (label) {
            case 'INFO':
                return chalk.bgGreen(label)
            case 'ERROR':
                return chalk.bgRedBright(label)
            case 'FATAL':
                return chalk.bgRed(label)
            case 'DEBUG':
                return chalk.bgMagenta(label)
        }
    }

    private static formatDate(timestamp: string) {
        return chalk.bgWhite.black(timestamp)
    }

    private static _log(msg: any, label: LogLevel) {
        const timestamp = `[${new Date().toISOString()}]`

        const _msg = (msg instanceof Error) ? `${msg.name}: ${msg.stack}` : `${msg}`

        console.log(`${this.formatDate(timestamp)}${this.colorLabel(label)} ${_msg}`)
    }

    public static info(msg: any) {
        Logger._log(msg, 'INFO')
    }

    public static err(msg: any) {
        Logger._log(msg, 'ERROR')
    }

    public static fatal(msg: any) {
        Logger._log(msg, 'FATAL')
    }

    public static debug(msg: any) {
        Logger._log(msg, 'DEBUG')
    }

}

export default Logger