import { joinVoiceChannel } from "@discordjs/voice";
import { GuildMember, MessageOptions, StageChannel, VoiceChannel } from "discord.js";
import Session, { sessions } from "../Session";
import Song from "../Song";
import { search } from '../utils'
const ytfps = require('ytfps');

export const playHandler = async (session: Session | undefined, sender: GuildMember, arg: string, reply: (msg: MessageOptions | string)=>any) => {

    const channel = sender.voice.channel
    if (channel instanceof StageChannel) {
        await reply(':no_entry_sign: **Support for stage channels not implemented yet!**')
        return
    }
    if (!(channel instanceof VoiceChannel)) {
        await reply(':x: **You have to be in a voice channel to use this command!**')
        return
    }

    const guildId = sender.guild.id

    if (!session) {
        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId,
            adapterCreator: channel.guild.voiceAdapterCreator
        })

        const onDestroy = () => {
            sessions.delete(guildId)
        }

        session = new Session(voiceConnection, onDestroy)

        reply(`:thumbsup: **Joined voice channel \`${channel.name}\`!**`)
        sessions.set(guildId, session)
    }
    
    const isPossiblyPlaylist = arg.includes('list')

    if (isPossiblyPlaylist) {
        try {
            const res = await ytfps(arg)
            const urls = res.videos.map((video: any)=>video.url) as string[]
            reply(`:notes: **Adding ${urls.length} songs to the queue, this might take a while!**`)
            
            const promises: Promise<Song>[] = urls.map((url)=>Song.from(url, sender.id))

            const songs: Song[] = (await Promise.allSettled(promises))
            .filter((result)=>result.status === 'fulfilled')
            .map((result: any)=>result.value)
            
            for (let song of songs) {
                session.enqueue(song)
            }

            reply(`:notes: **Added ${songs.length} songs to the queue!**${songs.length === urls.length ? '' : `, failed to add ${urls.length-songs.length} songs`}`)
            return
        } catch (e) {
            if (String(e).includes('private')) {
                reply(':octagonal_sign: **This playlist is private or broken**')
                if (!arg.includes('watch?v=')) return
            } else {
                console.log(e)
            }
        }
    }

    let song
    try {
        song = await Song.from(arg, sender.id)
    } catch (e) {
        try {
            const url = await search(arg)
            song = await Song.from(url, sender.id)
        } catch (e) {
            console.log(e)
        }   
    }
    if (!song) {
        reply(':octagonal_sign: Failed to resolve searchphrase/url, or the video is age-restricted')
        return
    }
    session.enqueue(song)
    reply(`:notes: **Added \`${song.title}\` to the queue!**`)

}