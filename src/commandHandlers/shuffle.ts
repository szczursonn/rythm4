import { CommandHandler, CommandHandlerParams } from "../commands"
import { shuffleArray } from "../utils"

export const shuffleHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }

    const queue = session.queue

    if (queue.length < 2) {
        await replyCb(':interrobang: **There is nothing to shuffle!**')
        return
    }

    shuffleArray(queue)
    await replyCb(':cyclone: **Shuffled the queue!**')
    return
}