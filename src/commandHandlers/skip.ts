import { CommandHandler, CommandHandlerParams } from "../commands"

export const skipHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    if (!session.currentlyPlaying) {
        await replyCb(':x: **There is nothing to skip!**')
        return
    }
    session.looping = false
    session.audioPlayer.stop(true)
    await replyCb(':fast_forward: ***Song skipped!***')
    return
}