import type stream from 'node:stream';
import type { LoggerTransport, LogRecord } from './logger.ts';

export class JsonLoggerTransport implements LoggerTransport {
    readonly #dst;

    public constructor({ dst }: { readonly dst: stream.Writable }) {
        this.#dst = dst;
    }

    public write({ time, module, level, msg, attrs }: LogRecord) {
        const base = {
            time: time.toISOString(),
            level,
            module,
            msg,
        };

        let line;
        try {
            line =
                Object.keys(attrs).length > 0
                    ? JSON.stringify({ ...base, attrs: JsonLoggerTransport.#toJsonSafe(attrs) })
                    : JSON.stringify(base);
        } catch (err) {
            line = JSON.stringify({ ...base, attrsError: String(err) });
        }

        this.#dst.write(`${line}\n`, 'utf-8');
    }

    static #toJsonSafe(value: unknown, ancestors = new Set<unknown>()): unknown {
        if (typeof value === 'bigint') {
            return value.toString();
        }

        if (typeof value !== 'object' || value === null) {
            return value;
        }

        if (ancestors.has(value)) {
            return '[Circular]';
        }

        ancestors.add(value);
        try {
            if (value instanceof Error) {
                const out: Record<string, unknown> = {
                    name: value.name,
                    message: value.message,
                };
                if (value.stack) {
                    out.stack = value.stack;
                }
                for (const [key, v] of Object.entries(value)) {
                    out[key] = this.#toJsonSafe(v, ancestors);
                }
                if (value.cause) {
                    out.cause = this.#toJsonSafe(value.cause, ancestors);
                }
                return out;
            }

            if (Array.isArray(value)) {
                return (value as unknown[]).map((item) => this.#toJsonSafe(item, ancestors));
            }

            const out: Record<string, unknown> = {};
            for (const [key, v] of Object.entries(value)) {
                out[key] = this.#toJsonSafe(v, ancestors);
            }
            return out;
        } finally {
            ancestors.delete(value);
        }
    }
}
