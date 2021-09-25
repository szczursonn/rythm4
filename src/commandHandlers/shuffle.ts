import { GuildMember, MessageOptions } from "discord.js"
import Session from "../Session"
import { shuffleArray } from "../utils"

export const shuffleHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }

    const queue = session.queue

    if (queue.length < 2) {
        await reply(':interrobang: **There is nothing to shuffle!**')
        return
    }

    shuffleArray(queue)
    await reply(':cyclone: **Shuffled the queue!**')
    return
}