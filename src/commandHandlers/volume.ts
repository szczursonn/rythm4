import { GuildMember, MessageOptions } from "discord.js"
import Session from "../Session"

export const volumeHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }
    const volume = parseFloat(arg)
    if (isNaN(volume)) {
        await reply(':x: **Provided volume is not a number**')
        return
    }
    
    try {
        session.volumeTransformer.setVolume(volume)
        session.volume = volume
        await reply(`:loudspeaker: **Successfully set volume to \`${volume}\`!**`)
    } catch (e) {
        await reply(':x: Failed to set volume: ' + e)
    }
    return
}