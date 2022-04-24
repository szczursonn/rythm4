import { Command } from "."

const skip: Command = {
    aliases: ['skip','fs','s'],
    description: 'Skip the current song',
    emoji: '⏭️',
    secret: false,
    handler: async ({session, replyCb}) => {
        if (!session) {
            await replyCb(':x: **I am not active on this server**')
            return
        }
        if (!session.getCurrentSong()) {
            await replyCb(':x: **There is nothing to skip!**')
            return
        }
        session.setLooping(false)
        session.skipSong()
        await replyCb(':fast_forward: ***Song skipped!***')
        return
    }
}

export default skip