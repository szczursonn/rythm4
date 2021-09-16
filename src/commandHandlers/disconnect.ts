import { MessageOptions } from "discord.js"
import Session from "../Session"

export const disconnectHandler = async (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        reply(':x: **I am not active on this server**')
        return
    }
    reply('***:beginner: :beginner: :beginner:Thanks for using pompa bocik  :100: :100: :100:***')
    session.destroy()
}