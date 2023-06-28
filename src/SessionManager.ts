import { Snowflake, VoiceChannel } from 'discord.js';
import Session from './Session';

export default class SessionManager {
    private sessions: Map<Snowflake, Session> = new Map();

    public get(guildId: Snowflake) {
        return this.sessions.get(guildId);
    }

    public start(voiceChannel: VoiceChannel): Session {
        const session = new Session(voiceChannel, () => {
            this.sessions.delete(voiceChannel.guildId);
        });
        this.sessions.set(voiceChannel.guildId, session);

        return session;
    }

    get count() {
        return this.sessions.size;
    }
}
