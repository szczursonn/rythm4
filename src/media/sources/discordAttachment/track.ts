import type { Attachment } from 'discord.js';
import { DirectUrlTrack } from '../directUrl/track.ts';

export class DiscordAttachmentTrack extends DirectUrlTrack {
    public constructor(attachment: Attachment) {
        super({
            title: attachment.name,
            url: attachment.url,
            durationMs: attachment.duration ? attachment.duration * 1000 : null,
        });
    }
}
