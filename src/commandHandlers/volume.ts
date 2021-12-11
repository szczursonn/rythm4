import { GuildMember, MessageOptions } from "discord.js"
import { CommandHandler, CommandHandlerParams } from "../commands"
import Session from "../Session"

export const volumeHandler: CommandHandler = async ({session, args, replyCb}: CommandHandlerParams) => {

    const arg = args[0]

    if (!session) {
        await replyCb(':x: **I am not active on this server**')
        return
    }
    const volume = parseFloat(arg)
    if (isNaN(volume)) {
        await replyCb(':x: **Provided volume is not a number**')
        return
    }
    
    try {
        session.volumeTransformer.setVolume(volume)
        session.volume = volume
        await replyCb(`:loudspeaker: **Successfully set volume to \`${volume}\`!**`)
    } catch (e) {
        await replyCb(':x: Failed to set volume: ' + e)
    }
    return
}