import { CommandHandler, CommandHandlerParams } from "../commands"

export const loopHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    session.looping = !session.looping
    await replyCb(`**${session.looping ? ':green_circle: Looping on' : ':red_circle: Looping off'}!**`)
    return
}