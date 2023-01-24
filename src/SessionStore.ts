import { Snowflake } from "discord.js";
import Logger from "./Logger";
import Session from "./Session";

export class SessionStore {
    private sessions: Map<Snowflake, Session> = new Map()
    private INACTIVE_DURATION = 10*60*1000 // 10min
    private INACTIVE_CHECK_INTERVAL = 15*1000 // 15s

    public constructor() {
        setInterval(this.killInactiveSessions.bind(this), this.INACTIVE_CHECK_INTERVAL) // 15s
    }

    public get(guildId: Snowflake) {
        return this.sessions.get(guildId)
    }

    public set(guildId: Snowflake, session: Session | null) {
        if (session) {
            this.sessions.set(guildId, session)
        } else {
            this.sessions.delete(guildId)
        }
    }

    public count() {
        return this.sessions.size
    }

    public killAll() {
        this.sessions.forEach((session)=>{
            session.destroy()
        })
        this.sessions.clear()
    }

    private killInactiveSessions() {
        let count = 0
        for (const [guildId, session] of this.sessions) {
            if (new Date().getTime() > session.lastPlayedDate.getTime() + this.INACTIVE_DURATION) {
                count++
                session.destroy()
                this.set(guildId, null)
            }
        }
        if (count > 0) Logger.debug(`Killed ${count} inactive sessions`)
    }
}