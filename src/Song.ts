import { AudioResource, createAudioResource } from "@discordjs/voice"
import { Snowflake } from "discord.js"
import ytdl, { getInfo } from "ytdl-core-discord"
import Logger from "./Logger"

interface ISong {
    title: string,
    author: string,
    url: string,
    duration: number,
    addedBy: Snowflake,
}

class Song implements ISong {
    public readonly title: string
    public readonly author: string
    public readonly url: string
    public readonly duration: number
    public readonly addedBy: Snowflake

    public constructor({title, author, url, duration, addedBy}: ISong) {
        this.title = title,
        this.author = author,
        this.url = url,
        this.duration = duration
        this.addedBy = addedBy
    }

    public async createAudioResource(): Promise<AudioResource> {
        const stream = await ytdl(this.url, {
            highWaterMark: 1<<25,
            filter: 'audio',
            quality: 'highestaudio'
        })

        stream.once('error', (e) => {
            Logger.err(`Audio stream error: ${e}`)
        })
        
        return createAudioResource(stream)
    }

    public static async from(url: string, addedBy: Snowflake) {
        const { videoDetails } = await getInfo(url)

        return new Song({
            title: videoDetails.title,
            author: videoDetails.author.name,
            url: videoDetails.video_url,
            duration: parseInt(videoDetails.lengthSeconds),
            addedBy,
        })
    }
}

export default Song