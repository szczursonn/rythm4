import { Command, CommandHandlerParams } from ".";

export class PauseCommand extends Command {
    aliases = ['pause']
    description = 'Pause playback'
    icon = '⏸️'
    hidden = false
    options = undefined

    public async handle( { session, replyHandler }: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        if (!session.currentSong) {
            await replyHandler.reply(':x: **Nothing is playing!**')
            return
        }
        if (session.isPaused) {
            await replyHandler.reply(':x: **I am already paused!**')
            return
        }
        session.pause()
        await replyHandler.reply(':pause_button: ***Player paused!***')
        return
    }

}