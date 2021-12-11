import { AudioPlayerStatus } from "@discordjs/voice"
import { CommandHandler, CommandHandlerParams } from "../commands"

export const unpauseHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        await replyCb(':x: **Nothing is playing!**')
        return
    }
    if (session.audioPlayer.state.status !== AudioPlayerStatus.Paused) {
        await replyCb(':x: **I am not paused!**')
        return
    }
    session.audioPlayer.unpause()
    await replyCb(':play_pause: ***Player unpaused!***')
    return
}