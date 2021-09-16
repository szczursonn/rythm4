import { MessageOptions } from "discord.js"
import Session from "../Session"

export const loopHandler = async (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        reply(':x: **I am not active on this server**')
        return
    }
    session.looping = !session.looping
    reply(`**${session.looping ? ':green_circle: Looping on' : ':red_circle: Looping off'}!**`)
}