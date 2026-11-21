import timers from 'node:timers';
import { describe, it, expect, vi } from 'vitest';
import { CleanupStack } from './cleanupStack.ts';

describe('CleanupStack', () => {
    it('runs steps in reverse registration order', async () => {
        const stack = new CleanupStack();
        const calls: string[] = [];
        stack.register('first', () => calls.push('first'));
        stack.register('second', () => calls.push('second'));
        stack.register('third', () => calls.push('third'));

        await stack.run({ onError: vi.fn() });

        expect(calls).toEqual(['third', 'second', 'first']);
    });

    it('awaits each async step before starting the next', async () => {
        const stack = new CleanupStack();
        const calls: string[] = [];
        const { promise, resolve } = Promise.withResolvers();

        stack.register('first', () => calls.push('first'));
        stack.register('second', async () => {
            calls.push('second:start');
            await promise;
            calls.push('second:end');
        });

        const running = stack.run({ onError: vi.fn() });
        await new Promise((r) => timers.setImmediate(r));
        expect(calls).toEqual(['second:start']);

        resolve(undefined);
        await running;
        expect(calls).toEqual(['second:start', 'second:end', 'first']);
    });

    it('reports errors from failing steps and keeps going', async () => {
        const stack = new CleanupStack();
        const calls: string[] = [];
        const syncError = new Error('sync');
        const asyncError = new Error('async');
        const onError = vi.fn();

        stack.register('first', () => calls.push('first'));
        stack.register('async-fail', () => Promise.reject(asyncError));
        stack.register('sync-fail', () => {
            throw syncError;
        });

        await stack.run({ onError });

        expect(calls).toEqual(['first']);
        expect(onError).toHaveBeenCalledTimes(2);
        expect(onError).toHaveBeenNthCalledWith(1, 'sync-fail', syncError);
        expect(onError).toHaveBeenNthCalledWith(2, 'async-fail', asyncError);
    });

    it('swallows errors thrown by onError', async () => {
        const stack = new CleanupStack();
        const calls: string[] = [];

        stack.register('first', () => calls.push('first'));
        stack.register('fail', () => {
            throw new Error('step');
        });

        await expect(
            stack.run({
                onError: () => {
                    throw new Error('onError');
                },
            }),
        ).resolves.toBeUndefined();
        expect(calls).toEqual(['first']);
    });

    it('resolves without calling onError when empty', async () => {
        const onError = vi.fn();
        await expect(new CleanupStack().run({ onError })).resolves.toBeUndefined();
        expect(onError).not.toHaveBeenCalled();
    });
});
