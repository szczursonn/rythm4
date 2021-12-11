import { CommandHandler, CommandHandlerParams } from "../commands"

export const clearHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    if (session.queue.length < 1) {
        await replyCb(':x: **The queue is already empty!**')
        return
    }
    session.queue = []
    await replyCb(':broom: **Queue cleared!**')
    return
}