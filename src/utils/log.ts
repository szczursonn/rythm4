import { NODE_ENV } from "../config"

export enum LoggingLabel {
    INFO = 'INFO',
    ERROR = 'ERROR',
    WARNING = 'WARN',
    DEBUG = 'DEBUG'
}

export const log = (message: any, label: LoggingLabel): void => {
    if (label === LoggingLabel.DEBUG && NODE_ENV !== 'development') return
    const formattedMessage = `${new Date().toLocaleString()} | ${label} | ${message}`
    console.log(formattedMessage)
}