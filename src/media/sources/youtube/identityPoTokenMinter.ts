import { JSDOM, VirtualConsole } from 'jsdom';
import * as z from 'zod';
import { BotGuardClient, getChallenge } from 'bgutils-js/botguard';
import { WebPoMinter } from 'bgutils-js/webpo';
import { base64ToU8, buildURL, getHeaders, USER_AGENT } from 'bgutils-js/utils';
import type { IBotguardClientSideBgChallenge, WebPoSignalOutput } from 'bgutils-js/shared-types';

const REQUEST_KEY = 'O43z0dpjhgX20SCx4KAo';
const YOUTUBE_ORIGIN = 'https://www.youtube.com/';
const DEFAULT_INTEGRITY_TOKEN_TTL_SECS = 60 * 60 * 6; // 6h

// [integrityToken, estimatedTtlSecs, mintRefreshThreshold, websafeFallbackToken, ...]
const integrityTokenResponseSchema = z.tuple([z.string().min(1), z.number().nullish()]).rest(z.unknown());

export class YoutubeIdentityPoTokenMinter {
    readonly #dom: JSDOM;
    readonly #webPoMinter: WebPoMinter;
    readonly #expiresAtTimestamp: number;

    #destroyed = false;

    private constructor(dom: JSDOM, webPoMinter: WebPoMinter, expiresAtTimestamp: number) {
        this.#dom = dom;
        this.#webPoMinter = webPoMinter;
        this.#expiresAtTimestamp = expiresAtTimestamp;
    }

    public static async create() {
        // Fetched from the Web Anti-Abuse API rather than InnerTube's /att/get, whose response depends on
        // the InnerTube client in use (it may lack the challenge or be rejected outright).
        const bgChallenge = await getChallenge({ requestKey: REQUEST_KEY, fetchFunction: fetch, useYouTubeAPI: true });
        if (!bgChallenge.program || !bgChallenge.globalName) {
            throw new Error('BotGuard challenge is missing the program or global name');
        }

        const interpreterJavascript = await YoutubeIdentityPoTokenMinter.#fetchInterpreterJavascript(bgChallenge);

        const dom = new JSDOM('<!DOCTYPE html><html><head></head><body></body></html>', {
            url: YOUTUBE_ORIGIN,
            referrer: YOUTUBE_ORIGIN,
            resources: { userAgent: USER_AGENT },
            runScripts: 'outside-only',
            pretendToBeVisual: true,
            // drop BotGuard's realm console output
            virtualConsole: new VirtualConsole(),
        });

        try {
            dom.window.eval(interpreterJavascript);

            const botguard = await BotGuardClient.create({
                program: bgChallenge.program,
                globalName: bgChallenge.globalName,
                globalObject: dom.window,
            });

            const webPoSignalOutput: WebPoSignalOutput = [];
            const botguardResponse = await botguard.snapshot({ webPoSignalOutput });

            const integrityTokenResponse = await fetch(buildURL('GenerateIT', true), {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify([REQUEST_KEY, botguardResponse]),
            });
            if (!integrityTokenResponse.ok) {
                throw new Error(`Failed to generate integrity token: HTTP ${integrityTokenResponse.status}`);
            }
            const [integrityToken, estimatedTtlSecs] = integrityTokenResponseSchema.parse(
                await integrityTokenResponse.json(),
            );

            // realmMintCallback expects "Uint8Array" to be from the BotGuard's realm (it does "instanceof Uint8Array")
            const RealmUint8Array = dom.window.eval('Uint8Array') as Uint8ArrayConstructor;

            const getMinter = webPoSignalOutput[0];
            if (!getMinter) {
                throw new Error('BotGuard did not provide a PO token minter factory');
            }
            const realmMintCallback: unknown = await getMinter(new RealmUint8Array(base64ToU8(integrityToken)));
            if (typeof realmMintCallback !== 'function') {
                throw new Error('BotGuard failed to create a PO token minter');
            }

            const webPoMinter = new WebPoMinter(async (contentBinding) => {
                const result: unknown = await (realmMintCallback as (binding: Uint8Array) => Promise<unknown>)(
                    new RealmUint8Array(contentBinding),
                );
                return ArrayBuffer.isView(result)
                    ? new Uint8Array(result.buffer, result.byteOffset, result.byteLength).slice()
                    : undefined;
            });

            return new YoutubeIdentityPoTokenMinter(
                dom,
                webPoMinter,
                Date.now() + (estimatedTtlSecs ?? DEFAULT_INTEGRITY_TOKEN_TTL_SECS) * 1000,
            );
        } catch (err) {
            dom.window.close();
            throw err;
        }
    }

    static async #fetchInterpreterJavascript(bgChallenge: IBotguardClientSideBgChallenge) {
        const inlineJavascript = bgChallenge.interpreterJavascript?.privateDoNotAccessOrElseSafeScriptWrappedValue;
        if (inlineJavascript) {
            return inlineJavascript;
        }

        const interpreterUrl = bgChallenge.interpreterUrl?.privateDoNotAccessOrElseTrustedResourceUrlWrappedValue;
        if (!interpreterUrl) {
            throw new Error('BotGuard challenge has neither interpreter javascript nor its URL');
        }

        const response = await fetch(new URL(interpreterUrl, YOUTUBE_ORIGIN), {
            headers: { 'user-agent': USER_AGENT },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch BotGuard interpreter: HTTP ${response.status}`);
        }
        return response.text();
    }

    public get expiresAtTimestamp() {
        return this.#expiresAtTimestamp;
    }

    public mint(id: string) {
        if (this.#destroyed) {
            throw new Error('PO token minter has been destroyed');
        }

        return this.#webPoMinter.mintAsWebsafeString(id);
    }

    public destroy() {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;
        this.#dom.window.close();
    }
}
