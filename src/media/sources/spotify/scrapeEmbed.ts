import * as z from 'zod';
import { parseSpotifyUri, spotifyUriSchema, type SpotifyUri } from './uri.ts';
import { createSpotifyUrl } from './url.ts';

const NEXT_JS_DATA_SCRIPT_TAG_OPEN = '<script id="__NEXT_DATA__" type="application/json">';
const NEXT_JS_DATA_SCRIPT_TAG_CLOSE = '</script>';

const FETCH_TIMEOUT_MS = 10_000;

const spotifyEmbedDataSchema = z.object({
    props: z.object({
        pageProps: z.object({
            state: z.object({
                data: z.object({
                    entity: spotifyUriSchema.extend({
                        title: z.string(),
                        subtitle: z.string().optional(),
                        duration: z.number().optional(),
                        artists: z
                            .array(
                                z.object({
                                    name: z.string(),
                                }),
                            )
                            .optional(),
                        trackList: z
                            .array(
                                z
                                    .object({
                                        uri: z.string().transform((str, ctx) => {
                                            const uri = parseSpotifyUri(str);
                                            if (!uri) {
                                                ctx.addIssue({ code: 'custom', message: 'Invalid Spotify URI' });
                                                return z.NEVER;
                                            }
                                            return uri;
                                        }),
                                        title: z.string(),
                                        subtitle: z.string(),
                                        duration: z.number(),
                                    })
                                    // unsupported items shouldn't fail the whole list
                                    .optional()
                                    .catch(undefined),
                            )
                            .transform((items) => items.filter((item) => item) as NonNullable<(typeof items)[number]>[])
                            .optional(),
                    }),
                }),
            }),
        }),
    }),
});

export const fetchSpotifyEmbedData = async (uri: SpotifyUri) => {
    const res = await fetch(createSpotifyUrl(uri, { embed: true }), {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
        throw new Error(`Spotify embed request for ${uri.type} "${uri.id}" failed: ${res.status} ${res.statusText}`);
    }

    const html = await res.text();
    const scriptTagOpenIdx = html.indexOf(NEXT_JS_DATA_SCRIPT_TAG_OPEN);
    if (scriptTagOpenIdx < 0) {
        throw new Error('Unable to find NextJS data script tag open');
    }

    const scriptTagCloseIdx = html.indexOf(NEXT_JS_DATA_SCRIPT_TAG_CLOSE, scriptTagOpenIdx);
    if (scriptTagCloseIdx < 0) {
        throw new Error('Unable to find NextJS data script tag close');
    }

    return spotifyEmbedDataSchema.parse(
        JSON.parse(html.substring(scriptTagOpenIdx + NEXT_JS_DATA_SCRIPT_TAG_OPEN.length, scriptTagCloseIdx)),
    );
};
