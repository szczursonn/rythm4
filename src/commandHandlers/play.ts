import { GuildMember, MessageOptions, Permissions, StageChannel, VoiceChannel } from "discord.js";
import { DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import ytfps from 'ytfps';
const usetube = require('usetube')

import Session from "../Session";
import Song from "../Song";

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
        const myPermissions = channel.permissionsFor(channel.guild.me!)
        if (!myPermissions.has(Permissions.FLAGS.CONNECT)) {
            await reply(`:x: **I don't have permission to join your voice channel!**`)
            return
        }

        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId,
            adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator
        })

        try {
            await entersState(voiceConnection, VoiceConnectionStatus.Ready, 10*1000)
            await reply(`:thumbsup: **Joined voice channel \`${channel.name}\`!**`)
        } catch (e) {
            await reply(`:x: **Failed to join voice channel: \`\`\`${e}\`\`\`**`)
            return
        }

        session = new Session(voiceConnection, guildId)
    }
    
    const isPossiblyPlaylist = arg.includes('list')

    if (isPossiblyPlaylist) {
        try {
            const res = await ytfps(arg)
            const urls = res.videos.map((video: any)=>video.url)
            
            const promises: Promise<Song>[] = urls.map(url=>Song.from(url, sender.id))

            const songs: Song[] = (await Promise.allSettled(promises))
            .filter((result)=>result.status === 'fulfilled')
            .map((result: any)=>result.value)
            
            for (let song of songs) {
                session.enqueue(song)
            }

            await reply(`:notes: **Added ${songs.length} songs to the queue!**${songs.length === urls.length ? '' : `, failed to add ${urls.length-songs.length} songs`}`)
            return
        } catch (e) {
            if (String(e).includes('private')) {
                await reply(':octagonal_sign: **This playlist is private or broken**')
                if (!arg.includes('watch?v=')) return
            }
        }
    }

    let song
    try {
        song = await Song.from(arg, sender.id)
    } catch (e) {
        try {
            const id = (await usetube.searchVideo(arg)).videos[0].id
            const url = `https://www.youtube.com/watch?v=${id}`
            song = await Song.from(url, sender.id)
        } catch (e) {
            console.log(e)
        }   
    }
    if (!song) {
        await reply(':octagonal_sign: Failed to resolve searchphrase/url, or the video is age-restricted')
        return
    }
    session.enqueue(song)
    await reply(`:notes: **Added \`${song.title}\` to the queue!**`)
    return
}