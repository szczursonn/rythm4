export class CleanupStack {
    readonly #steps: { label: string; fn: () => unknown }[] = [];

    public register(label: string, fn: () => unknown) {
        this.#steps.push({ label, fn });
    }

    public async run({ onError }: { onError: (label: string, err: unknown) => void }) {
        for (const { label, fn } of this.#steps.splice(0).reverse()) {
            try {
                await fn();
            } catch (err) {
                try {
                    onError(label, err);
                } catch {}
            }
        }
    }
}
