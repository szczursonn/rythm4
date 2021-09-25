import { GuildMember, MessageOptions } from "discord.js"
import { clearHandler, loopHandler, playHandler, skipHandler } from "."
import Session from "../Session"

const noop = ()=>{}

export const wypierdalajHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {
    const url = 'https://www.youtube.com/watch?v=8QQk_CoHbyQ'
    if (session) {
        await clearHandler(session, sender, arg, noop)
        if (session.currentlyPlaying) await skipHandler(session, sender, arg, noop)
    }
    await playHandler(session, sender, url, noop)
    
    const ses = Session.sessions.get(sender.guild.id)
    if (!ses?.looping) await loopHandler(ses, sender, arg, noop)
    await reply('🔥 ***BO JESTEŚ KURWA BALAS I CHUJ*** 🔥')
    return
}