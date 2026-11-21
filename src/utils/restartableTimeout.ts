import events from 'node:events';
import timers from 'node:timers';

export class RestartableTimeout extends events.EventEmitter<{
    fired: [];
}> {
    #handle: ReturnType<typeof timers.setTimeout> | null = null;

    public constructor() {
        super();
    }

    public get running() {
        return this.#handle !== null;
    }

    public restart(delayMs: number) {
        this.stop();
        this.#handle = timers.setTimeout(this.#handleTimeoutFired.bind(this), delayMs);
    }

    public stop() {
        if (this.#handle !== null) {
            timers.clearTimeout(this.#handle);
            this.#handle = null;
        }
    }

    #handleTimeoutFired() {
        this.stop();
        this.emit('fired');
    }
}

export class FixedDelayRestartableTimeout extends RestartableTimeout {
    readonly #delayMs;

    public constructor(delayMs: number) {
        super();
        this.#delayMs = delayMs;
    }

    public override restart() {
        super.restart(this.#delayMs);
    }
}
