import { Command } from "."

const loop: Command = {
    aliases: ['loop'],
    description: 'Toogle looping current song',
    emoji: '🔄',
    secret: false,
    handler: async ({session, replyCb}) => {
        if (!session) {
            await replyCb(':x: **I am not active on this server**')
            return
        }
        if (session.isLooping()) {
            session.setLooping(false)
        } else {
            session.setLooping(true)
        }
    
        await replyCb(`**${session.isLooping() ? ':green_circle: Looping on' : ':red_circle: Looping off'}!**`)
        return
    }
}

export default loop