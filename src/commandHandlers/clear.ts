import { GuildMember, MessageOptions } from "discord.js"
import Session from "../Session"

export const clearHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }
    if (session.queue.length < 1) {
        await reply(':x: **The queue is already empty!**')
        return
    }
    session.queue = []
    await reply(':broom: **Queue cleared!**')
    return
}