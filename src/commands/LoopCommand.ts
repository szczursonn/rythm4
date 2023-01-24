import { Command, CommandHandlerParams } from ".";

export class LoopCommand extends Command {
    aliases = ['loop']
    description = 'Toogle looping current song'
    icon = '🔄'
    hidden = false
    options = undefined

    public async handle( { session, replyHandler }: CommandHandlerParams ): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        if (session.isLooping) {
            session.isLooping = false
        } else {
            session.isLooping = true
        }
    
        await replyHandler.reply(`**${session.isLooping ? ':green_circle: Looping on' : ':red_circle: Looping off'}!**`)
        return
    }
}