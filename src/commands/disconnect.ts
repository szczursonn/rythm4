import { Command, CommandHandler } from "."

const disconnect: Command = {
    aliases: ['disconnect','dc','fuckoff'],
    description: 'Disconnect the bot from a voice channel',
    emoji: '🛑',
    secret: false,
    handler: async ({session, replyCb}) => {
        if (!session) {
            await replyCb(':x: **I am not active on this server**')
            return
        }
        await replyCb('***:beginner: :beginner: :beginner:Thanks for using pompa bocik  :100: :100: :100:***')
        session.destroy()
        return
    }
}

export default disconnect