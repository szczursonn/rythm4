// import { Readable } from 'node:stream';

// export abstract class ResilientStream extends Readable {
//     private currentStream: Readable | null = null;
//     private bytesRead = 0;

//     private retryCount = 0;
//     private maxRetries: number;

//     private isRecovering = false;
//     private isDestroyed = false;

//     protected constructor({ maxRetries = 2 }: { maxRetries?: number } = {}) {
//         super();
//         this.maxRetries = maxRetries;
//     }

//     protected abstract createStream(byteOffset: number): Promise<Readable>;

//     protected shouldRetry(err: Error) {
//         return true;
//     }

//     public override async _read() {
//         if (this.isRecovering) {
//             return;
//         }

//         if (this.currentStream === null) {
//             try {
//                 await this.restartStream();
//             } catch (err) {
//                 this.destroy(err as Error);
//             }
//         } else {
//             this.currentStream.resume();
//         }
//     }

//     public override async _destroy(err: Error | null, callback: (err?: Error | null) => void) {
//         this.isDestroyed = true;
//         this.cleanupStream();
//         callback(err);
//     }

//     private async restartStream() {
//         if (this.currentStream !== null) {
//             this.cleanupStream();
//         }

//         this.currentStream = await this.createStream(this.bytesRead);

//         this.currentStream.on('data', this.handleStreamData.bind(this));
//         this.currentStream.on('error', this.handleStreamError.bind(this));
//         this.currentStream.on('end', this.handleStreamEnd.bind(this));

//         this.retryCount = 0;
//     }

//     private async handleStreamData(chunk: unknown) {
//         if (!(chunk instanceof Buffer)) {
//             this.handleStreamError(new Error('stream did not return buffer'));
//             return;
//         }

//         this.bytesRead += chunk.length;
//         if (!this.push(chunk)) {
//             this.currentStream?.pause();
//         }
//     }

//     private async handleStreamError(err: Error) {
//         if (this.isRecovering || this.isDestroyed) {
//             return;
//         }

//         if (this.retryCount >= this.maxRetries || !this.shouldRetry(err)) {
//             this.destroy(err);
//             return;
//         }

//         try {
//             this.isRecovering = true;
//             this.retryCount++;

//             await this.restartStream();

//             if (this.readableFlowing !== false) {
//                 this.currentStream?.resume();
//             }
//         } catch (err) {
//             this.destroy(err instanceof Error ? err : new Error(`${err}`));
//         } finally {
//             this.isRecovering = false;
//         }
//     }

//     private handleStreamEnd() {
//         this.push(null);
//     }

//     private cleanupStream() {
//         if (this.currentStream === null) {
//             return;
//         }

//         this.currentStream.removeAllListeners();
//         this.currentStream.destroy();
//         this.currentStream = null;
//     }
// }
