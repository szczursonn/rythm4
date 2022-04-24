import { Command } from "."

const clear: Command = {
    aliases: ['clear'],
    description: 'Clear the queue',
    emoji: '🧹',
    secret: false,
    handler: async ({session, replyCb}) => {
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
}

export default clear