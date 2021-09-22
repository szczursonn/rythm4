import { MessageOptions } from "discord.js"
import Session from "../Session"

/* https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array /*
/* Randomize array in-place using Durstenfeld shuffle algorithm */
const shuffleArray = (array: any[]) => {
    for (var i = array.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var temp = array[i];
        array[i] = array[j];
        array[j] = temp;
    }
}

export const shuffleHandler = async (session: Session | undefined, reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }

    const queue = session.queue

    if (queue.length < 2) {
        await reply(':interrobang: **There is nothing to shuffle!**')
        return
    }

    shuffleArray(queue)
    await reply(':cyclone: **Shuffled the queue!**')
    return
}