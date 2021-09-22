import { MessageOptions } from "discord.js"
import Session from "../Session"

export const skipHandler = async (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        await reply(':x: **There is nothing to skip!**')
        return
    }
    session.looping = false
    session.audioPlayer.stop(true)
    await reply(':fast_forward: ***Song skipped!***')
    return
}