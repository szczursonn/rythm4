import { Command } from "."

const unpause: Command = {
    aliases: ['unpause', 'resume'],
    description: 'Resume playback',
    emoji: '⏯️',
    secret: false,
    handler: async ({session, replyCb}) => {
        if (!session) {
            await replyCb(':x: **I am not active on this server**')
            return
        }
        if (!session.getCurrentSong()) {
            await replyCb(':x: **Nothing is playing!**')
            return
        }
        if (!session.isPaused()) {
            await replyCb(':x: **I am not paused!**')
            return
        }
        session.unpause()
        await replyCb(':play_pause: ***Player unpaused!***')
        return
    }
}

export default unpause