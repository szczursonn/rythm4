import { AudioPlayerStatus } from "@discordjs/voice"
import { CommandHandler, CommandHandlerParams } from "../commands"

export const pauseHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        await replyCb(':x: **Nothing is playing!**')
        return
    }
    if (session.audioPlayer.state.status === AudioPlayerStatus.Paused) {
        await replyCb(':x: **I am already paused!**')
        return
    }
    session.audioPlayer.pause(true)
    await replyCb(':pause_button: ***Player paused!***')
    return
}