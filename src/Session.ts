import { Snowflake } from "discord.js";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, entersState, VoiceConnection, VoiceConnectionDisconnectReason, VoiceConnectionStatus } from "@discordjs/voice";
import Song from "./Song";
import { shuffleArray, wait } from "./utils";
import Logger from "./Logger";
import { AppConfig } from "./AppConfig";

class Session {
    private audioPlayer: AudioPlayer = createAudioPlayer()

    private queue: Song[] = []
    private currentlyPlaying: Song | null = null

    public isLooping: boolean = false
    private isProcessingQueue: boolean = false

    private readyLock: boolean = false

    private _lastPlayedDate = new Date()

    public constructor(private voiceConnection: VoiceConnection, public readonly guildId: Snowflake, private config: AppConfig) {

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
                this.processQueue()
            }
        })

        this.audioPlayer.on('error', (err) => {
            Logger.err(`audioPlayer error on guild ${this.guildId}: `)
            Logger.err(err)
        })

        this.voiceConnection.subscribe(this.audioPlayer)

        Logger.info(`Session created on guild ${this.guildId}`)
    }

    public skipSong() {
        this.audioPlayer.stop() // will automatically play next song
    }

    public shuffleQueue() {
        shuffleArray(this.queue)
    }

    public get isPaused() {
        return this.audioPlayer.state.status === AudioPlayerStatus.Paused
    }

    public pause() {
        this.audioPlayer.pause(true)
    }

    public unpause() {
        this.audioPlayer.unpause()
    }

    public get currentSong() {
        return this.currentlyPlaying
    }

    public get lastPlayedDate() {
        return this.currentlyPlaying ? new Date() : this._lastPlayedDate
    }

    public getQueue() {
        return [...this.queue]  // shallow copy
    }

    public clearQueue() {
        this.queue = []
    }

    public enqueue(song: Song) {
        this.queue.push(song)
        this.processQueue()
        Logger.debug(`Enqueued song "${song.title}" on guild ${this.guildId}`)
    }

    public destroy() {
        this.destroy = ()=>{}   // Can only be called once
        this.queue = []
        if (this.voiceConnection.state.status !== VoiceConnectionStatus.Destroyed) this.voiceConnection.destroy()
        this.audioPlayer.stop(true)
        Logger.info(`Session destroyed on guild ${this.guildId}`)
    }

    private async processQueue() {

        if (this.isProcessingQueue || this.audioPlayer.state.status !== AudioPlayerStatus.Idle) {
            return
        }

        if (this.queue.length === 0 && !this.isLooping && this.currentlyPlaying) {
            this.currentlyPlaying = null
            return
        }

        this.isProcessingQueue = true
        this.audioPlayer.unpause()
        
        const nextSong: Song = this.isLooping ? this.currentlyPlaying! : this.queue.shift()!
        this._lastPlayedDate = new Date()

        try {
            const audioResource = await nextSong.createAudioResource(this.config.ytCookie)
            this.audioPlayer.play(audioResource)
            this.isProcessingQueue = false
            this.currentlyPlaying = nextSong
        } catch (err) {
            Logger.err(`Failed to create audioResource: `)
            Logger.err(err)
            this.processQueue()
            this.isProcessingQueue = false
        }
    }
}

export default Session