import { Command, CommandHandlerParams } from ".";

export class SkipCommand extends Command {
    aliases = ['skip', 'fs', 's']
    description = 'Skip the current song'
    icon = '⏭️'
    hidden = false
    options = undefined

    public async handle( {session, replyHandler}: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        if (!session.currentSong) {
            await replyHandler.reply(':x: **There is nothing to skip!**')
            return
        }
        session.isLooping = false
        session.skipSong()
        await replyHandler.reply(':fast_forward: ***Song skipped!***')
    }

}