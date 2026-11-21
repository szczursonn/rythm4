import process from 'node:process';
import path from 'node:path';
import timers from 'node:timers';
import * as z from 'zod';
import main from './main.ts';

const SHUTDOWN_SIGNALS = ['SIGINT', 'SIGTERM'] as const;
const PROCESS_EXIT_TIMEOUT = 5_000;
const DEFAULT_DATA_DIR = './data';
const DATA_DIR_OVERRIDE_ENV_KEY = 'RYTHM4_DATA';

const EXIT_CODE_SETUP_ERROR = 1;
const EXIT_CODE_RUNTIME_ERROR = 2;
const EXIT_CODE_FATAL_ERROR = 3;

const abortController = new AbortController();

const shutdownSignalHandler = () => {
    abortController.abort();
};
for (const shutdownSignal of SHUTDOWN_SIGNALS) {
    process.on(shutdownSignal, shutdownSignalHandler);
}
abortController.signal.addEventListener('abort', () => {
    // remove signal handlers so next ones kill the process immediately
    for (const shutdownSignal of SHUTDOWN_SIGNALS) {
        process.removeListener(shutdownSignal, shutdownSignalHandler);
    }

    // kill the process if it doesn't shut down itself
    timers
        .setTimeout(() => {
            process.exitCode ??= EXIT_CODE_FATAL_ERROR;
            // eslint-disable-next-line n/no-process-exit
            process.exit();
        }, PROCESS_EXIT_TIMEOUT)
        .unref();
});

try {
    const dataDirPath = path.resolve(
        process.cwd(),
        z.string().trim().min(1).default(DEFAULT_DATA_DIR).parse(process.env[DATA_DIR_OVERRIDE_ENV_KEY]),
    );

    const mainResult = await main({
        dataDirPath,
        stderr: process.stderr,
        signal: abortController.signal,
    });

    switch (mainResult) {
        case 'setupError':
            process.exitCode ??= EXIT_CODE_SETUP_ERROR;
            break;
        case 'runtimeError':
            process.exitCode ??= EXIT_CODE_RUNTIME_ERROR;
            break;
    }
} catch (err) {
    if (!abortController.signal.aborted) {
        process.exitCode ??= EXIT_CODE_FATAL_ERROR;
        console.error(err);
    }
} finally {
    abortController.abort();
}
