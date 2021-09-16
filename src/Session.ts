import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, entersState, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionStatus } from "@discordjs/voice";
import { Snowflake } from "discord.js";
import Song from "./Song";
import { promisify } from 'util'

const wait = promisify(setTimeout)

class Session {
    public readonly voiceConnection: VoiceConnection
    public currentlyPlaying: Song | null
    public queue: Song[]
    public readonly audioPlayer: AudioPlayer
    public readyLock: boolean
    public looping: boolean
    public volume: number
    private onDestroy: ()=>void
    public volumeTransformer: any

    static sessions:Map<Snowflake,Session> = new Map()

    constructor(voiceConnection: VoiceConnection, onDestroy: ()=>void) {
        this.voiceConnection = voiceConnection
        this.audioPlayer = createAudioPlayer()
        this.queue = []
        this.currentlyPlaying = null
        this.readyLock = false
        this.onDestroy = onDestroy
        this.looping = false
        this.volume = 1

        // https://github.com/discordjs/voice/blob/main/examples/music-bot/src/music/subscription.ts#L32
        this.voiceConnection.on('stateChange', async (oldState, newState) => {
            if (newState.status === VoiceConnectionStatus.Disconnected) {
                if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                    // Wait 5 seconds to determine if client was kicked from VC or is switching VC
                    try {
                        await entersState(this.voiceConnection, VoiceConnectionStatus.Connecting, 5000)
                    } catch (e) {
                        this.voiceConnection.destroy()
                    }
                } else if (this.voiceConnection.rejoinAttempts < 5) {
                    await wait((this.voiceConnection.rejoinAttempts + 1) * 5000)
                    this.voiceConnection.rejoin()
                } else {
                    this.voiceConnection.destroy()
                }
            } else if (newState.status === VoiceConnectionStatus.Destroyed) {
                this.destroy()
            } else if (!this.readyLock && (newState.status === VoiceConnectionStatus.Connecting || newState.status === VoiceConnectionStatus.Signalling)) {
                this.readyLock = true
                try {
                    await entersState(this.voiceConnection, VoiceConnectionStatus.Ready, 20000)
                } catch (e) {
                    if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy()
                } finally {
                    this.readyLock = false
                }
            }
        })

        this.audioPlayer.on('stateChange', (oldState, newState) => {
            if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
                // audio resource finished playing
                this.advanceQueue()
            }
        })

        this.voiceConnection.subscribe(this.audioPlayer)

    }

    enqueue(song: Song) {
        this.queue.push(song)
        if (!this.currentlyPlaying) this.advanceQueue()
    }

    destroy() {
        this.queue = []
        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy()
        this.audioPlayer.stop(true)
        this.onDestroy()
        this.onDestroy = ()=>{} // prevent being called multiple times
    }

    async advanceQueue() {
        let nextSong
        this.volumeTransformer = null

        if (this.currentlyPlaying && this.looping) {
            nextSong = this.currentlyPlaying
        } else {
            this.currentlyPlaying = null
            if (this.queue.length === 0) {
                return
            }
            nextSong = this.queue.shift()!
        }
        
        this.currentlyPlaying = nextSong

        try {
            const resource = await nextSong.createAudioResource()
            const volumeTransformer = resource.volume
            this.volumeTransformer = volumeTransformer
            volumeTransformer?.setVolume(this.volume)
            this.audioPlayer.play(resource)
        } catch (e) {
            console.log(e)
            await this.advanceQueue()
        }
    }
}

export default Session

export const sessions = Session.sessions