import type stream from 'node:stream';
import type { LoggerTransport, LogLevel, LogRecord } from './logger.ts';

export class PrettyLoggerTransport implements LoggerTransport {
    readonly #dst;

    public constructor({ dst }: { readonly dst: stream.Writable }) {
        this.#dst = dst;
    }

    public write({ time, module, level, msg, attrs }: LogRecord) {
        const parts = [
            '[',
            time.getHours().toString().padStart(2, '0'),
            ':',
            time.getMinutes().toString().padStart(2, '0'),
            ':',
            time.getSeconds().toString().padStart(2, '0'),
            '.',
            time.getMilliseconds().toString().padStart(3, '0'),
            '] ',
        ];

        if (module.length > 0) {
            parts.push('[', module, '] ');
        }

        parts.push(PrettyLoggerTransport.#getLevelLabel(level), ': ', msg);

        const formattedAttrs = new Map<string, string>();
        PrettyLoggerTransport.#flattenAttrs(attrs, formattedAttrs);

        for (const [key, value] of formattedAttrs) {
            parts.push('\n\t', key, ': ', value.replaceAll('\n', '\n\t'));
        }

        parts.push('\n');

        this.#dst.write(parts.join(''), 'utf-8');
    }

    static #flattenAttrs(
        attrs: Record<string, unknown> | readonly unknown[],
        out: Map<string, string>,
        prefix = '',
        ancestors = new Set<object>(),
    ) {
        ancestors.add(attrs);

        const entries = Array.isArray(attrs)
            ? attrs.map((value, index) => [index.toString(), value] as const)
            : Object.entries(attrs).sort(([aKey], [bKey]) => {
                  if (aKey < bKey) {
                      return -1;
                  }

                  if (aKey > bKey) {
                      return 1;
                  }

                  return 0;
              });

        for (const [key, value] of entries) {
            const prefixedKey = prefix + key;

            if (Array.isArray(value) || PrettyLoggerTransport.#isPlainObject(value)) {
                if (ancestors.has(value)) {
                    out.set(prefixedKey, '[Circular]');
                } else if (Array.isArray(value) && value.length === 0) {
                    out.set(prefixedKey, '[]');
                } else if (Object.keys(value).length === 0) {
                    out.set(prefixedKey, '{}');
                } else {
                    PrettyLoggerTransport.#flattenAttrs(value, out, `${prefixedKey}.`, ancestors);
                }
            } else {
                out.set(prefixedKey, PrettyLoggerTransport.#formatAttrValue(value));
            }
        }

        ancestors.delete(attrs);
    }

    static #isPlainObject(value: unknown): value is Record<string, unknown> {
        if (typeof value !== 'object' || value === null) {
            return false;
        }

        const proto = Object.getPrototypeOf(value) as unknown;
        return proto === Object.prototype || proto === null;
    }

    static #formatAttrValue(value: unknown): string {
        if (value instanceof Error) {
            const formatted = value.stack ?? [value.name, value.message].filter(Boolean).join(': ');

            if (value.cause) {
                return `${formatted}\nCaused by: ${PrettyLoggerTransport.#formatAttrValue(value.cause)}`;
            }

            return formatted;
        }

        try {
            const jason = JSON.stringify(value, null, 4) as string | undefined;
            if (jason !== undefined && jason !== '{}') {
                return jason;
            }
        } catch {
            //
        }

        return String(value);
    }

    static #getLevelLabel(level: LogLevel) {
        switch (level) {
            case 'debug':
                return 'DEBUG';
            case 'info':
                return 'INFO';
            case 'warn':
                return 'WARN';
            case 'error':
                return 'ERROR';
        }
    }
}
