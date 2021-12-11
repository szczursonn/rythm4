import { Snowflake } from "discord.js";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, entersState, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionStatus } from "@discordjs/voice";
import Song from "./Song";
import { noop, shuffleArray, wait } from "./utils";

class Session {
    private voiceConnection: VoiceConnection
    private currentlyPlaying: Song | null
    private queue: Song[]
    private audioPlayer: AudioPlayer
    private readyLock: boolean
    private looping: boolean
    private guildId: Snowflake;
    private disconnectTimeoutId: number | undefined

    private static sessions: Map<Snowflake,Session> = new Map()

    constructor(voiceConnection: VoiceConnection, guildId: Snowflake) {
        
        this.voiceConnection = voiceConnection
        this.audioPlayer = createAudioPlayer()
        this.queue = []
        this.currentlyPlaying = null
        this.readyLock = false
        this.looping = false
        this.guildId = guildId

        // https://github.com/discordjs/voice/blob/main/examples/music-bot/src/music/subscription.ts#L32
        this.voiceConnection.on('stateChange', async (_, newState) => {
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

        this.audioPlayer.on('error', (err) => {
            console.log(`audioPlayer error: ${err}`)
        })

        this.voiceConnection.subscribe(this.audioPlayer)

        Session.sessions.set(guildId, this)
        console.log(`Session created on guild ${this.guildId}`)
    }

    public skipSong() {
        this.advanceQueue()
    }

    public shuffleQueue() {
        shuffleArray(this.queue)
    }

    public isLooping() {
        return this.looping
    }

    public setLooping(looping: boolean) {
        this.looping = looping
    }

    public isPaused() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Paused
    }

    public pause() {
        this.audioPlayer.pause(true)
    }

    public unpause() {
        this.audioPlayer.unpause()
    }

    public getCurrentSong() {
        return this.currentlyPlaying
    }

    public getQueue() {
        return [...this.queue]  // shallow copy
    }

    public clearQueue() {
        this.queue = []
    }

    public enqueue(song: Song) {
        this.queue.push(song)
        if (!this.currentlyPlaying) this.advanceQueue()
    }

    public destroy() {
        this.destroy = noop   // Can only be called once
        this.queue = []
        clearTimeout(this.disconnectTimeoutId)
        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy()
        this.audioPlayer.stop(true)
        Session.sessions.delete(this.guildId)
        console.log(`Session destroyed on guild ${this.guildId}`)
    }

    public async advanceQueue() {
        let nextSong

        clearTimeout(this.disconnectTimeoutId)

        if (this.currentlyPlaying && this.looping) {
            nextSong = this.currentlyPlaying
        } else {
            this.currentlyPlaying = null
            if (this.queue.length === 0) {
                const TIMEOUT_DURATION = 15*60*1000 // 15m
                this.disconnectTimeoutId = Number(setTimeout(()=>{
                    this.destroy()
                }, TIMEOUT_DURATION))
                return
            }
            nextSong = this.queue.shift()!
        }
        
        this.currentlyPlaying = nextSong

        try {
            const resource = await nextSong.createAudioResource()
            this.audioPlayer.play(resource)
        } catch (e) {
            console.log(e)
            await this.advanceQueue()
        }
    }

    public static getSession(guildId: Snowflake) {
        return this.sessions.get(guildId)
    }

    public static getAllSessions() {
        return Array.from(this.sessions.values())
    }
}

export default Session