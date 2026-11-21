import events from 'node:events';
import {
    type AudioPlayerState,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource,
    NoSubscriberBehavior,
} from '@discordjs/voice';
import type { Logger } from '../logger/logger.ts';
import type { StreamableTrack, Track } from '../media/media.ts';
import { shuffle } from '../utils/shuffle.ts';

type SessionPlayerEntry = {
    track: Track;
    loadPromise: Promise<StreamableTrack> | null;
};

export class SessionPlayer extends events.EventEmitter<{
    loadError: [error: unknown, track: Track];
    playbackError: [error: unknown, track: Track];
    idleChange: [];
}> {
    public readonly audioPlayer;

    readonly #logger;

    #current: SessionPlayerEntry | null = null;
    #queue: SessionPlayerEntry[] = [];

    #looping = false;
    #isIdle = true;
    #destroyed = false;

    public constructor({ logger }: { readonly logger: Logger }) {
        super();
        this.#logger = logger;

        this.audioPlayer = createAudioPlayer({
            behaviors: {
                noSubscriber: NoSubscriberBehavior.Pause,
            },
        });
        this.audioPlayer.on('stateChange', this.#handleAudioPlayerStateChangeEvent.bind(this));
        this.audioPlayer.on('error', this.#handleAudioPlayerErrorEvent.bind(this));
        this.audioPlayer.on('debug', this.#handleAudioPlayerDebugEvent.bind(this));
    }

    public get isIdle() {
        return this.#isIdle;
    }
    private set isIdle(isIdle: boolean) {
        if (this.#isIdle === isIdle) {
            return;
        }

        this.#isIdle = isIdle;
        this.#logger.debug('Idle changed', {
            isIdle,
        });

        this.emit('idleChange');
    }

    public get looping() {
        return this.#looping;
    }
    public set looping(looping) {
        if (this.#destroyed || this.#looping === looping) {
            return;
        }

        this.#looping = looping;
        this.#logger.debug('Looping changed', {
            looping,
        });
    }

    public get currentTrack() {
        return this.#current?.track ?? null;
    }

    public get queue() {
        return this.#queue.values().map((entry) => entry.track);
    }

    public get queueSize() {
        return this.#queue.length;
    }

    public enqueue(tracks: readonly Track[]) {
        if (this.#destroyed || tracks.length === 0) {
            return;
        }

        this.#queue.push(...tracks.map((track) => ({ track, loadPromise: null })));
        this.#logger.debug('Enqueued tracks', {
            count: tracks.length,
            queueSize: this.queueSize,
        });

        if (this.#current) {
            this.#preloadHead();
        } else {
            this.#playNext();
        }
    }

    public clearQueue() {
        if (this.#destroyed || this.#queue.length === 0) {
            return;
        }

        const removedCount = this.#queue.splice(0).length;
        this.#logger.debug('Cleared queue', {
            removedCount,
        });
    }

    public shuffleQueue() {
        if (this.#destroyed || this.#queue.length < 2) {
            return;
        }

        shuffle(this.#queue);
        this.#logger.debug('Shuffled queue', {
            queueSize: this.queueSize,
        });

        this.#preloadHead();
    }

    public skip() {
        if (this.#destroyed || !this.#current) {
            return;
        }

        this.looping = false;

        if (this.audioPlayer.state.status === AudioPlayerStatus.Idle) {
            // the current track is still loading, discard and continue
            this.#playNext();
        } else {
            // the player going idle will play the next track automatically
            this.audioPlayer.stop();
        }
    }

    public destroy() {
        if (this.#destroyed) {
            return;
        }
        this.#destroyed = true;

        this.audioPlayer.stop(true);
    }

    #playNext() {
        if (this.#destroyed) {
            return;
        }

        const entry = this.#looping && this.#current ? this.#current : (this.#queue.shift() ?? null);
        this.#current = entry;
        this.#preloadHead();

        if (!entry) {
            this.isIdle = true;
            return;
        }
        this.isIdle = false;

        this.#load(entry)
            .then((streamable) => {
                if (this.#destroyed || this.#current !== entry) {
                    // destroyed or skipped while loading
                    return;
                }

                try {
                    this.audioPlayer.play(createAudioResource(streamable.createStream()));
                } catch (err) {
                    this.#logger.error('Failed to start playback', {
                        err,
                        title: streamable.title,
                    });
                    this.emit('playbackError', err, streamable);
                    this.#current = null;
                    this.#playNext();
                    return;
                }

                this.#logger.debug('Started playback', {
                    title: streamable.title,
                    webPageUrl: streamable.webPageUrl,
                    durationMs: streamable.durationMs,
                });
            })
            .catch(() => {
                // errors are handled by #handleLoadFailure
            });
    }

    #preloadHead() {
        const head = this.#queue[0];
        if (this.#destroyed || !head) {
            return;
        }

        void this.#load(head);
    }

    #load(entry: SessionPlayerEntry) {
        if (!entry.loadPromise) {
            this.#logger.debug('Loading track', {
                title: entry.track.title,
            });

            entry.loadPromise = entry.track.resolveToStreamable().then((streamable) => {
                entry.track = streamable;
                return streamable;
            });
            entry.loadPromise.catch((err: unknown) => {
                this.#handleLoadFailure(entry, err);
            });
        }

        return entry.loadPromise;
    }

    #handleLoadFailure(entry: SessionPlayerEntry, err: unknown) {
        if (this.#destroyed) {
            return;
        }

        const isCurrent = this.#current === entry;
        const queueIndex = this.#queue.indexOf(entry);
        if (!isCurrent && queueIndex === -1) {
            // it was skipped or removed in the meantime
            return;
        }

        this.#logger.error('Failed to load track', {
            err,
            title: entry.track.title,
        });
        this.emit('loadError', err, entry.track);

        if (queueIndex !== -1) {
            this.#queue.splice(queueIndex, 1);
            this.#preloadHead();
        }
        if (isCurrent) {
            this.#current = null;
            this.#playNext();
        }
    }

    #handleAudioPlayerStateChangeEvent(oldState: AudioPlayerState, newState: AudioPlayerState) {
        this.#logger.debug('Audio player state change', {
            oldStatus: oldState.status,
            newStatus: newState.status,
        });

        if (newState.status === AudioPlayerStatus.Idle && oldState.status !== AudioPlayerStatus.Idle) {
            this.#playNext();
        }
    }

    #handleAudioPlayerErrorEvent(err: Error) {
        this.#logger.error('discord.js audio player error', {
            err,
        });

        const track = this.currentTrack;
        if (!this.#destroyed && track) {
            // don't replay a track that fails
            this.looping = false;
            this.emit('playbackError', err, track);
        }
    }

    #handleAudioPlayerDebugEvent(message: string) {
        this.#logger.debug('discord.js audio player debug', {
            message,
        });
    }
}
