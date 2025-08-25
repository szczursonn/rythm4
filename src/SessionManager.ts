import type { Snowflake, VoiceBasedChannel } from 'discord.js';
import type { MusicBot } from './MusicBot.ts';
import { Session } from './Session.ts';

export class SessionManager {
    private readonly guildIdToSession = new Map<Snowflake, Session>();

    public constructor(public readonly bot: MusicBot) {}

    public getSession(guildId: Snowflake) {
        return this.guildIdToSession.get(guildId) ?? null;
    }

    public getOrCreateSession(voiceChannel: VoiceBasedChannel, notificationsChannelId: Snowflake) {
        return this.getSession(voiceChannel.guildId) ?? new Session(this.bot, notificationsChannelId, voiceChannel);
    }

    public registerSession(session: Session) {
        this.guildIdToSession.set(session.guildId, session);
    }

    public unregisterSession(session: Session) {
        this.guildIdToSession.delete(session.guildId);
    }

    public destroyAll(logReason: string) {
        for (const [, session] of this.guildIdToSession) {
            session.destroy(logReason);
        }
    }
}
