import { type Client, type Snowflake, type VoiceBasedChannel } from 'discord.js';
import type { Logger } from '../logger/logger.ts';
import { Session } from './session.ts';

export class SessionLimitReachedError extends Error {
    public constructor() {
        super(`Session limit reached`);
        this.name = 'SessionLimitReachedError';
    }
}

export class SessionManager {
    readonly #logger;
    readonly #limit;
    readonly #inactivityTimeoutMs;
    readonly #clientToSessions = new Map<Client, Map<Snowflake, Session>>();
    #isDestroyed = false;

    public constructor({
        logger,
        limit,
        inactivityTimeoutMs,
    }: {
        logger: Logger;
        limit: number;
        inactivityTimeoutMs: number;
    }) {
        this.#logger = logger;
        this.#limit = limit;
        this.#inactivityTimeoutMs = inactivityTimeoutMs;
    }

    public get size() {
        return this.#clientToSessions.values().reduce((acc, sessions) => acc + sessions.size, 0);
    }

    public get(client: Client, guildId: Snowflake) {
        return this.#clientToSessions.get(client)?.get(guildId) ?? null;
    }

    public getAllForClient(client: Client) {
        return Array.from(this.#clientToSessions.get(client)?.values() ?? []);
    }

    public create({
        voiceChannel,
        notificationChannelId,
    }: {
        voiceChannel: VoiceBasedChannel;
        notificationChannelId: Snowflake | null;
    }) {
        if (this.#isDestroyed) {
            throw new Error('Session manager is destroyed');
        }

        const client = voiceChannel.client;
        if (this.get(client, voiceChannel.guildId)) {
            throw new Error(`Session already exists for guild ${voiceChannel.guildId}`);
        }
        if (this.size >= this.#limit) {
            throw new SessionLimitReachedError();
        }

        const session = new Session({
            voiceChannel,
            notificationChannelId,
            logger: this.#logger,
            inactivityTimeoutMs: this.#inactivityTimeoutMs,
        });
        session.on('destroyed', () => {
            const sessions = this.#clientToSessions.get(client);
            if (sessions?.get(session.guildId) !== session) {
                return;
            }

            sessions.delete(session.guildId);
            if (sessions.size === 0) {
                this.#clientToSessions.delete(client);
            }
        });

        let sessions = this.#clientToSessions.get(client);
        if (!sessions) {
            sessions = new Map();
            this.#clientToSessions.set(client, sessions);
        }
        sessions.set(session.guildId, session);

        return session;
    }

    public destroy() {
        if (this.#isDestroyed) {
            return;
        }
        this.#isDestroyed = true;

        for (const sessions of this.#clientToSessions.values()) {
            for (const session of sessions.values()) {
                session.destroy();
            }
        }
    }
}
