import { CommandHandler } from "../commands"

export const clearHandler: CommandHandler = async ({session, replyCb}) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    if (session.getQueue().length < 1) {
        await replyCb(':x: **The queue is already empty!**')
        return
    }
    session.clearQueue()
    await replyCb(':broom: **Queue cleared!**')
    return
}