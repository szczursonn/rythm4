export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export type LoggerAttrs = Readonly<Record<string, unknown>>;

export type LogRecord = {
    readonly time: Date;
    readonly module: string;
    readonly level: LogLevel;
    readonly msg: string;
    readonly attrs: LoggerAttrs;
};

export type LoggerTransport = {
    write(record: LogRecord): void;
};

export class Logger {
    readonly #transport;
    readonly #minLevelIndex;
    readonly #module;
    readonly #attrs;

    public static create(opts: { readonly transport: LoggerTransport; readonly level: LogLevel }) {
        return new Logger(opts);
    }

    private constructor({
        transport,
        level,
        module = '',
        attrs = {},
    }: {
        readonly transport: LoggerTransport;
        readonly level: LogLevel;
        readonly module?: string;
        readonly attrs?: LoggerAttrs;
    }) {
        this.#transport = transport;
        this.#minLevelIndex = LOG_LEVELS.indexOf(level);
        this.#module = module;
        this.#attrs = attrs;
    }

    public isLevelEnabled(level: LogLevel) {
        return LOG_LEVELS.indexOf(level) >= this.#minLevelIndex;
    }

    public debug(msg: string, attrs?: LoggerAttrs) {
        this.#log('debug', msg, attrs);
    }

    public info(msg: string, attrs?: LoggerAttrs) {
        this.#log('info', msg, attrs);
    }

    public warn(msg: string, attrs?: LoggerAttrs) {
        this.#log('warn', msg, attrs);
    }

    public error(msg: string, attrs?: LoggerAttrs) {
        this.#log('error', msg, attrs);
    }

    public withModule(module: string) {
        return this.#createChild({
            module: this.#module.length === 0 ? module : `${this.#module}/${module}`,
            attrs: this.#attrs,
        });
    }

    public withAttrs(attrs: LoggerAttrs) {
        return this.#createChild({
            module: this.#module,
            attrs: { ...this.#attrs, ...attrs },
        });
    }

    #createChild({ module, attrs }: { module: string; attrs: LoggerAttrs }) {
        return new Logger({
            transport: this.#transport,
            level: LOG_LEVELS[this.#minLevelIndex]!,
            module,
            attrs,
        });
    }

    #log(level: LogLevel, msg: string, attrs?: LoggerAttrs) {
        if (!this.isLevelEnabled(level)) {
            return;
        }

        this.#transport.write({
            time: new Date(),
            module: this.#module,
            level,
            msg,
            attrs: attrs ? { ...this.#attrs, ...attrs } : this.#attrs,
        });
    }
}
