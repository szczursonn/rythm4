import { Command, CommandHandlerParams } from ".";

export class ClearCommand extends Command {
    description = 'Clear the queue'
    aliases = ['clear', 'cls']
    icon = '🧹'
    hidden = false
    options = undefined

    public async handle({ session, replyHandler }: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        if (session.getQueue().length < 1) {
            await replyHandler.reply(':x: **The queue is already empty!**')
            return
        }
        session.clearQueue()
        await replyHandler.reply(':broom: **Queue cleared!**')
    }
}