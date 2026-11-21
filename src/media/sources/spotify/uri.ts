import * as z from 'zod';

export const spotifyEntityTypeSchema = z.enum(['track', 'playlist', 'album']);

export const spotifyUriSchema = z.object({
    type: spotifyEntityTypeSchema,
    id: z.string().min(1),
});

export type SpotifyUri = z.infer<typeof spotifyUriSchema>;

const spotifyUriRegex = /^spotify:(?<type>[a-z]+):(?<id>[a-zA-Z0-9]+)$/;
export const parseSpotifyUri = (uriString: string) =>
    spotifyUriSchema.safeParse(spotifyUriRegex.exec(uriString)?.groups).data ?? null;
