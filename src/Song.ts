import { AudioResource, createAudioResource } from "@discordjs/voice"
import { getInfo } from "ytdl-core-discord"
import ytdl from 'ytdl-core-discord'
import { Snowflake } from "discord-api-types"
import { finished } from 'stream'

interface SongInfo {
    title: string,
    author: string,
    url: string,
    duration: string,
    addedBy: string,
}


class Song {
    public readonly title: string
    public readonly author: string
    public readonly url: string
    public readonly duration: number
    public readonly addedBy: string

    private constructor({title, author, url, duration, addedBy}: SongInfo) {
        this.title = title,
        this.author = author,
        this.url = url,
        this.duration = parseInt(duration)
        this.addedBy = addedBy
    }

    public async createAudioResource(): Promise<AudioResource> {
        const stream = await ytdl(this.url, {
            highWaterMark: 1<<25
        })
        finished(stream, (err) => {
            if (err) {
                console.log(`ytdl stream failed: ${err}`)
            }
        })
        return createAudioResource(stream, {
            inlineVolume: true
        })
    }

    public static async from(url: string, addedBy: Snowflake) {
        const info = await getInfo(url)

        return new Song({
            title: info.videoDetails.title,
            author: info.videoDetails.author.name,
            url: info.videoDetails.video_url,
            duration: info.videoDetails.lengthSeconds,
            addedBy,
        })
    }
}

export default Song