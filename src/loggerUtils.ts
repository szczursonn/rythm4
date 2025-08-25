import { z } from 'zod';

export const ERROR_LOG_KEY = 'err';

export const formatError = (error: unknown) => {
    if (error instanceof z.ZodError) {
        return JSON.stringify(error.flatten().fieldErrors);
    }

    if (error instanceof Error) {
        if (error.stack) {
            return error.stack;
        }

        return [error.name, error.message].filter(Boolean).join(': ');
    }

    try {
        const stringifyResult = JSON.stringify(error);
        if (stringifyResult !== '{}') {
            return stringifyResult;
        }
    } catch (_) {}

    return String(error);
};
