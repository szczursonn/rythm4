import timers from 'node:timers';
import type { HealthChecker, HealthCheckFailure } from './checker.ts';

export class HealthCheckPeriodicRunner {
    readonly #checker;
    readonly #interval;
    readonly #onResult;

    public constructor({
        checker,
        intervalMs,
        onResult,
    }: {
        readonly checker: HealthChecker;
        readonly intervalMs: number;
        readonly onResult?: (failures: readonly HealthCheckFailure[]) => unknown;
    }) {
        this.#checker = checker;
        this.#interval = timers.setInterval(this.#handleIntervalFired.bind(this), intervalMs);
        this.#onResult = onResult;
    }

    public destroy() {
        timers.clearInterval(this.#interval);
    }

    #handleIntervalFired() {
        void this.#checker.run().then((failures) => this.#onResult?.(failures));
    }
}
