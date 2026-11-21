import { MessageFlags, type Message } from 'discord.js';
import type { Logger } from '../../../logger/logger.ts';
import type { HybridCommandInvocationHandlerContext } from '../../command.ts';

export class ClassicCommandInvocationHandlerContext<TArgs> implements HybridCommandInvocationHandlerContext<TArgs> {
    public readonly logger;
    public readonly args;

    readonly #message;
    #replyMessage: Message<true> | null = null;
    #replyPromiseChain = Promise.resolve();

    public constructor({ message, logger, args }: { message: Message<true>; logger: Logger; args: TArgs }) {
        this.#message = message;
        this.logger = logger;
        this.args = args;
    }

    public get client() {
        return this.#message.client;
    }

    public get guildId() {
        return this.#message.guildId;
    }

    public get channelId() {
        return this.#message.channelId;
    }

    public get userId() {
        return this.#message.author.id;
    }

    public upsertReply({ content = '', embeds = [], suppressEmbeds = false }) {
        const replyPromise = this.#replyPromiseChain.then(async () => {
            if (this.#replyMessage === null) {
                this.#replyMessage = await this.#message.reply({
                    content,
                    embeds,
                    flags: suppressEmbeds
                        ? [MessageFlags.SuppressNotifications, MessageFlags.SuppressEmbeds]
                        : [MessageFlags.SuppressNotifications],
                    failIfNotExists: false,
                });
                this.logger.debug('Message reply sent', { content, embedsCount: embeds.length });
            } else {
                await this.#replyMessage.edit({
                    content,
                    embeds,
                    flags: suppressEmbeds ? [MessageFlags.SuppressEmbeds] : [],
                });
                this.logger.debug('Message reply edited', { content, embedsCount: embeds.length });
            }
        });

        this.#replyPromiseChain = replyPromise.catch(() => {
            // ignore error in next calls
        });

        return replyPromise;
    }
}
