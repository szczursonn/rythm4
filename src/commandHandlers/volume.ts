import { MessageOptions } from "discord.js"
import Session from "../Session"

export const volumeHandler = (session: Session | undefined, volume: number, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        reply(':x: **I am not active on this server**')
        return
    }
    
    session.volume = volume
    try {
        session.volumeTransformer.setVolume(volume)
        reply(`:loudspeaker: **Successfully set volume to \`${volume}\`!**`)
    } catch (e) {
        reply(':x: Failed to set volume: ' + e)
    }

}