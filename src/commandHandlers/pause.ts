import { MessageOptions } from "discord.js"
import { AudioPlayerStatus } from "@discordjs/voice"
import Session from "../Session"

export const pauseHandler = async (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        await reply(':x: **Nothing is playing!**')
        return
    }
    if (session.audioPlayer.state.status === AudioPlayerStatus.Paused) {
        await reply(':x: **I am already paused!**')
        return
    }
    session.audioPlayer.pause(true)
    await reply(':pause_button: ***Player paused!***')
    return
}