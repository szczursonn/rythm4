import { Command, CommandHandlerParams } from ".";
import { SessionStore } from "../SessionStore";

export class DisconnectCommand extends Command {
    aliases = ['disconnect','dc','fuckoff']
    description = 'Disconnect the bot from a voice channel'
    icon = '🛑'
    hidden = false
    options = undefined

    public constructor(private sessionStore: SessionStore) {
        super()
    }

    public async handle({ session, replyHandler }: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        await replyHandler.reply('***:beginner: :beginner: :beginner:Thanks for using pompa bocik  :100: :100: :100:***')
        this.sessionStore.set(session.guildId, null)
        session.destroy()
        return
    }
}