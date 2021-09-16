import { MessageOptions } from "discord.js"
import Session from "../Session"

export const skipHandler = (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        reply(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        reply(':x: **There is nothing to skip!**')
        return
    }
    session.looping = false
    session.audioPlayer.stop(true)
    reply(':fast_forward: ***Song skipped!***')
}