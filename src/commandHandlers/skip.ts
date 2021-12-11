import { CommandHandler, CommandHandlerParams } from "../commands"

export const skipHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    if (!session.getCurrentSong()) {
        await replyCb(':x: **There is nothing to skip!**')
        return
    }
    session.setLooping(false)
    session.skipSong()
    await replyCb(':fast_forward: ***Song skipped!***')
    return
}