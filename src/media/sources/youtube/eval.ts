import vm from 'node:vm';
import * as z from 'zod';
import { Platform } from 'youtubei.js';

const EVAL_TIMEOUT_MS = 2_500;

const evalResultSchema = z.record(z.string(), z.unknown());

// UNSAFE!!!
const unsafeInnertubeEval: typeof Platform.shim.eval = (data) => {
    const ctx = vm.createContext({ URL, URLSearchParams, TextEncoder, TextDecoder, atob, btoa });
    vm.runInContext('globalThis.window = globalThis.self = globalThis;', ctx);

    const script = new vm.Script(`(function(){\n${data.output}\n})()`, { filename: 'innertube-eval.js' });

    return evalResultSchema.safeParse(script.runInContext(ctx, { timeout: EVAL_TIMEOUT_MS })).data;
};

export const installUnsafeInnertubeEval = () => {
    Platform.shim.eval = unsafeInnertubeEval;
};
