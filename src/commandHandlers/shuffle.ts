import { CommandHandler, CommandHandlerParams } from "../commands"

export const shuffleHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }

    const queue = session.getQueue()

    if (queue.length < 2) {
        await replyCb(':interrobang: **There is nothing to shuffle!**')
        return
    }
    session.shuffleQueue()
    await replyCb(':cyclone: **Shuffled the queue!**')
    return
}