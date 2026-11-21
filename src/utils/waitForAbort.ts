export const waitForAbort = (signal: AbortSignal) =>
    new Promise<void>((resolve) => {
        if (signal.aborted) {
            resolve();
            return;
        }

        signal.addEventListener(
            'abort',
            () => {
                resolve();
            },
            { once: true },
        );
    });
