import { Permissions, StageChannel, VoiceChannel } from "discord.js";
import { DiscordGatewayAdapterCreator, entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import ytfps from 'ytfps';
const usetube = require('usetube')

import Session from "../Session";
import Song from "../Song";
import { Command } from ".";
import Logger from "../Logger";

const play: Command = {
    aliases: ['play','p'],
    description: 'Adds a requested song to the queue',
    emoji: '⏯️',
    secret: false,
    options: [{
        name: 'song',
        description: 'Song name or Youtube Video/Playlist URL',
        type: 3,
        required: true
    }],
    handler: async ({session, sender, args, replyCb}) => {

        const channel = sender.voice.channel
        if (channel instanceof StageChannel) {
            await replyCb(':no_entry_sign: **Support for stage channels not implemented yet!**')
            return
        }
        if (!(channel instanceof VoiceChannel)) {
            await replyCb(':x: **You have to be in a voice channel to use this command!**')
            return
        }
    
        const arg = args[0]
        if (!arg) {
            await replyCb(':x: **You must provide a youtube video/playlist link or a searchphrase!**')
            return
        }
    
        const guildId = sender.guild.id
    
        if (!session) {
            const myPermissions = channel.permissionsFor(channel.guild.me!)
            if (!myPermissions.has(Permissions.FLAGS.CONNECT)) {
                await replyCb(`:x: **I don't have permission to join your voice channel!**`)
                return
            }
    
            const voiceConnection = joinVoiceChannel({
                channelId: channel.id,
                guildId,
                adapterCreator: channel.guild.voiceAdapterCreator as unknown as DiscordGatewayAdapterCreator
            })
    
            try {
                await entersState(voiceConnection, VoiceConnectionStatus.Ready, 10*1000)
                await replyCb(`:thumbsup: **Joined voice channel \`${channel.name}\`!**`)
            } catch (e) {
                await replyCb(`:x: **Failed to join voice channel: \`\`\`${e}\`\`\`**`)
                Logger.debug(`Failed to join VC on guild ${guildId}:\n${e}`)
                return
            }
    
            session = new Session(voiceConnection, guildId)
        }
        
        const isPossiblyPlaylist = arg.includes('?list=') // only playlist-specific url, not video url with playlist
    
        if (isPossiblyPlaylist) {
            try {
                const res = await ytfps(arg)
                const urls = res.videos.map((video: any)=>video.url)
                
                const promises: Promise<Song>[] = urls.map(url=>Song.from(url, sender.id))
    
                const songs: Song[] = (await Promise.allSettled(promises))
                .filter((result)=>result.status === 'fulfilled')
                .map((result: any)=>result.value)
                
                for (const song of songs) {
                    session.enqueue(song)
                }
    
                await replyCb(`:notes: **Added ${songs.length} songs to the queue!**${songs.length === urls.length ? '' : `, failed to add ${urls.length-songs.length} songs`}`)
                return
            } catch (e) {
                if (String(e).includes('private')) {
                    await replyCb(':octagonal_sign: **This playlist is private**')
                    return
                } else {
                    Logger.err(`Playlist fetch failed without it being private: ${e}`)
                }
            }
        }
    
        let song
        try {
            song = await Song.from(arg, sender.id)
        } catch (e) {
            try {
                const id = (await usetube.searchVideo(args.join(''))).videos[0].id
                const url = `https://www.youtube.com/watch?v=${id}`
                song = await Song.from(url, sender.id)
            } catch (_) {}
        }
        if (!song) {
            await replyCb(':octagonal_sign: **Failed to resolve searchphrase/url, or the video is age-restricted**')
            return
        }
        session.enqueue(song)
        await replyCb(`:notes: **Added \`${song.title}\` to the queue!**`)
        return
    }
}

export default play