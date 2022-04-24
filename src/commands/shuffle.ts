import { Command } from "."

const shuffle: Command = {
    aliases: ['shuffle'],
    description: 'Shuffles the queue',
    emoji: '🌀',
    secret: false,
    handler: async ({session, replyCb}) => {
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
}

export default shuffle