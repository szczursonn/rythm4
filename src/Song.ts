import { AudioResource, createAudioResource } from "@discordjs/voice"
import { Snowflake } from "discord.js"
import ytdl, { getInfo } from "ytdl-core"
import Logger from "./Logger"

class Song {
    public readonly title: string
    public readonly author: string
    public readonly url: string
    public readonly duration: number
    public readonly addedBy: Snowflake

    public constructor({title, author, url, duration, addedBy}: {title: string, author: string, url: string, duration: number, addedBy: Snowflake}) {
        this.title = title,
        this.author = author,
        this.url = url,
        this.duration = duration
        this.addedBy = addedBy
    }

    public async createAudioResource(ytCookie?: string): Promise<AudioResource> {
        const stream = ytdl(this.url, {
            highWaterMark: 1<<25,
            filter: 'audio',
            quality: 'highestaudio',
            requestOptions: Song.getRequestOptions(ytCookie)
        })

        stream.once('error', (e) => {
            Logger.err(`Audio stream error: `)
            Logger.err(e)
        })
        
        return createAudioResource(stream)
    }

    public static async from(url: string, addedBy: Snowflake, ytCookie?: string) {
        const { videoDetails } = await getInfo(url, {
            requestOptions: Song.getRequestOptions(ytCookie)
        })

        return new Song({
            title: videoDetails.title,
            author: videoDetails.author.name,
            url: videoDetails.video_url,
            duration: parseInt(videoDetails.lengthSeconds),
            addedBy,
        })
    }

    private static getRequestOptions(ytCookie?: string) {
        return {
            headers: {
                cookie: ytCookie
            }
        }
    }
}

export default Song