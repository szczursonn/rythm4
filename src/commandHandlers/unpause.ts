import { AudioPlayerStatus } from "@discordjs/voice"
import { GuildMember, MessageOptions } from "discord.js"
import Session from "../Session"

export const unpauseHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        await reply(':x: **Nothing is playing!**')
        return
    }
    if (session.audioPlayer.state.status !== AudioPlayerStatus.Paused) {
        await reply(':x: **I am not paused!**')
        return
    }
    session.audioPlayer.unpause()
    await reply(':play_pause: ***Player unpaused!***')
    return
}