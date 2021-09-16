import { AudioPlayerStatus } from "@discordjs/voice"
import { MessageOptions } from "discord.js"
import Session from "../Session"

export const unpauseHandler = (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        reply(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        reply(':x: **Nothing is playing!**')
        return
    }
    if (session.audioPlayer.state.status !== AudioPlayerStatus.Paused) {
        reply(':x: **I am not paused!**')
        return
    }
    session.audioPlayer.unpause()
    reply(':play_pause: ***Player unpaused!***')
}