import { CommandHandler, CommandHandlerParams } from "../commands"

export const disconnectHandler: CommandHandler = async ({session, replyCb}: CommandHandlerParams) => {
    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    await replyCb('***:beginner: :beginner: :beginner:Thanks for using pompa bocik  :100: :100: :100:***')
    session.destroy()
    return
}