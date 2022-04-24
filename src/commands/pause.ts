import { Command } from "."

const pause: Command = {
    aliases: ['pause'],
    description: 'Pause playback',
    emoji: '⏸️',
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
        if (session.isPaused()) {
            await replyCb(':x: **I am already paused!**')
            return
        }
        session.pause()
        await replyCb(':pause_button: ***Player paused!***')
        return
    }
}

export default pause