import { Command, CommandHandlerParams } from ".";

export class ShuffleCommand extends Command {
    aliases = ['shuffle']
    description = 'Shuffles the queue'
    icon = '🌀'
    hidden = false
    options = undefined

    public async handle( {session, replyHandler}: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
    
        const queue = session.getQueue()
    
        if (queue.length < 2) {
            await replyHandler.reply(':interrobang: **There is nothing to shuffle!**')
            return
        }
        session.shuffleQueue()
        await replyHandler.reply(':cyclone: **Shuffled the queue!**')
    }
}