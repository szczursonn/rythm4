import { Command, CommandHandlerParams } from ".";

export class UnpauseCommand extends Command {
    aliases = ['unpause', 'resume']
    description = 'Resume playback'
    icon = '⏯️'
    hidden = false
    options = undefined

    public async handle({session, replyHandler}: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        if (!session.currentSong) {
            await replyHandler.reply(':x: **Nothing is playing!**')
            return
        }
        if (!session.isPaused) {
            await replyHandler.reply(':x: **I am not paused!**')
            return
        }
        session.unpause()
        await replyHandler.reply(':play_pause: ***Player unpaused!***')
    }

}