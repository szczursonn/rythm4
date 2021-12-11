import { NODE_ENV } from "../config"
import chalk from "chalk"

export enum LoggingLabel {
    INFO = 'INFO',
    ERROR = 'ERROR',
    WARNING = 'WARN',
    DEBUG = 'DEBUG'
}

const formatLabel = (label: LoggingLabel): string => {
    switch (label) {
        case LoggingLabel.INFO:
            return chalk.green(label)
        case LoggingLabel.ERROR:
            return chalk.red(label)
        case LoggingLabel.WARNING:
            return chalk.yellow(label)
        case LoggingLabel.DEBUG:
            return chalk.gray(label)
        default:
            return chalk.strikethrough(label)
    }
}

export const log = (message: any, label: LoggingLabel): void => {
    if (label === LoggingLabel.DEBUG && NODE_ENV !== 'development') return

    const formattedLabel = formatLabel(label)

    const formattedMessage = `${new Date().toLocaleString()} | ${formattedLabel} | ${message}`
    console.log(formattedMessage)
}