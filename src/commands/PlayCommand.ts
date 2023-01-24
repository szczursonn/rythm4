import { entersState, joinVoiceChannel, VoiceConnectionStatus } from "@discordjs/voice";
import { StageChannel, VoiceBasedChannel, VoiceChannel } from "discord.js";
import { Command, CommandHandlerParams } from ".";
import ytfps from 'ytfps';
import ytsearch from 'yt-search';
import Logger from "../Logger";
import Session from "../Session";
import Song from "../Song";
import { SessionStore } from "../SessionStore";
import { AppConfig } from "../AppConfig";

export class PlayCommand extends Command {
    aliases = ['play', 'p']
    description = 'Adds a requested song to the queue'
    icon = '⏯️'
    hidden = false
    options = [{
        name: 'song',
        description: 'Song name or Youtube Video/Playlist URL',
        type: 3,
        required: true
    }]

    public constructor(private sessionStore: SessionStore) {
        super()
    }
    
    public async handle( { session, sender, args, replyHandler, config }: CommandHandlerParams): Promise<void> {
        const channel = sender.voice.channel
        if (channel instanceof StageChannel) {
            await replyHandler.reply(':no_entry_sign: **Support for stage channels not implemented yet!**')
            return
        }
        if (!(channel instanceof VoiceChannel)) {
            await replyHandler.reply(':x: **You have to be in a voice channel to use this command!**')
            return
        }
    
        const arg = args[0]
        if (!arg) {
            await replyHandler.reply(':x: **You must provide a youtube video/playlist link or a searchphrase!**')
            return
        }
    
        if (!session) {
            try {
                session = await this.createSession(channel, replyHandler, config)
            } catch (err) {
                await replyHandler.reply(`:x: **Failed to join voice channel: \`\`\`${err}\`\`\`**`)
                Logger.err(`Failed to join VC on guild ${channel.guildId}:\n${err}`)
                return
            }
        }
        
        const isPossiblyPlaylist = arg.includes('?list=') // only playlist-specific url, not video url with playlist
    
        if (isPossiblyPlaylist) {
            try {
                const res = await ytfps(arg)
                const urls = res.videos.map((video: any)=>video.url)
                
                const promises: Promise<Song>[] = urls.map(url=>Song.from(url, sender.id, config.ytCookie))
    
                const songs: Song[] = (await Promise.allSettled(promises))
                .filter((result)=>result.status === 'fulfilled')
                .map((result: any)=>result.value)
                
                for (const song of songs) {
                    session.enqueue(song)
                }
    
                await replyHandler.reply(`:notes: **Added ${songs.length} songs to the queue!**${songs.length === urls.length ? '' : `, failed to add ${urls.length-songs.length} songs`}`)
                return
            } catch (e) {
                if (String(e).includes('private')) {
                    await replyHandler.reply(':octagonal_sign: **This playlist is private**')
                    return
                } else {
                    Logger.err(`Playlist fetch failed without it being private: ${e}`)
                }
            }
        }

        let song
        let err1
        let err2
        // from link
        if (arg.startsWith('http')) {
            try {
                song = await Song.from(arg, sender.id, config.ytCookie)
            } catch (err) {
                err1=err
                if (String(err).includes('410')) {
                    replyHandler.reply(':octagonal_sign: **Video is age-restricted**')
                    return
                }
            }
        }
        // search
        if (!song) {
            try {
                const id = (await ytsearch(args.join(''))).videos.shift()?.videoId
                if (id === undefined) {
                    await replyHandler.reply(':octagonal_sign: **Failed to find a video from searchphrase**')
                    return
                }
                const url = `https://www.youtube.com/watch?v=${id}`
                song = await Song.from(url, sender.id, config.ytCookie)
            } catch (err) {
                if (String(err).includes('410')) {
                    replyHandler.reply(':octagonal_sign: **Video is age-restricted**')
                    return
                }
                err2=err
            }
        }
        
        if (!song) {
            Logger.debug(`Failed to find video, link err: `)
            Logger.debug(err1)
            Logger.debug('search err: ')
            Logger.debug(err2)
            await replyHandler.reply(':octagonal_sign: **There has been an unexpected error, contact bot owner**')
            return
        }
        session.enqueue(song)
        await replyHandler.reply(`:notes: **Added \`${song.title}\` to the queue!**`)
        return
    }

    private async createSession(channel: VoiceBasedChannel, replyHandler: CommandHandlerParams['replyHandler'], config: AppConfig) {
        const myPermissions = channel.permissionsFor(channel.guild.members.me!)
        if (!myPermissions.has('Connect')) {
            await replyHandler.reply(`:x: **I don't have permission to join your voice channel!**`)
            throw new Error('missing connect permission')
        }

        const voiceConnection = joinVoiceChannel({
            channelId: channel.id,
            guildId: channel.guildId,
            adapterCreator: channel.guild.voiceAdapterCreator
        })

        await entersState(voiceConnection, VoiceConnectionStatus.Ready, 10*1000)
        await replyHandler.reply(`:thumbsup: **Joined voice channel \`${channel.name}\`!**`)

        const session = new Session(voiceConnection, channel.guildId, config)
        this.sessionStore.set(channel.guildId, session)
        return session
    }
}
