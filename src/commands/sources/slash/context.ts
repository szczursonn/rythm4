import { MessageFlags, type ChatInputCommandInteraction } from 'discord.js';
import type { Logger } from '../../../logger/logger.ts';
import type { HybridCommandInvocationHandlerContext } from '../../command.ts';

export class SlashCommandInvocationHandlerContext<TArgs> implements HybridCommandInvocationHandlerContext<TArgs> {
    public readonly logger;
    public readonly args;

    readonly #interaction;
    #replyPromiseChain = Promise.resolve();

    public constructor({
        interaction,
        logger,
        args,
    }: {
        interaction: ChatInputCommandInteraction<'cached'>;
        logger: Logger;
        args: TArgs;
    }) {
        this.#interaction = interaction;
        this.logger = logger;
        this.args = args;
    }

    public get client() {
        return this.#interaction.client;
    }

    public get guildId() {
        return this.#interaction.guildId;
    }

    public get channelId() {
        return this.#interaction.channelId;
    }

    public get userId() {
        return this.#interaction.user.id;
    }

    public async upsertReply({ content = '', embeds = [], ephemeral = false, suppressEmbeds = false }) {
        const replyPromise = this.#replyPromiseChain.then(async () => {
            if (this.#interaction.replied || this.#interaction.deferred) {
                await this.#interaction.editReply({
                    content,
                    embeds,
                    flags: suppressEmbeds ? [MessageFlags.SuppressEmbeds] : [],
                });
                this.logger.debug('Interaction reply edited', { content, embedsCount: embeds.length });
            } else {
                const flags: (
                    MessageFlags.SuppressNotifications | MessageFlags.SuppressEmbeds | MessageFlags.Ephemeral
                )[] = [MessageFlags.SuppressNotifications];
                if (suppressEmbeds) {
                    flags.push(MessageFlags.SuppressEmbeds);
                }
                if (ephemeral) {
                    flags.push(MessageFlags.Ephemeral);
                }

                await this.#interaction.reply({
                    content,
                    embeds,
                    flags,
                });
                this.logger.debug('Interaction reply sent', { content, embedsCount: embeds.length });
            }
        });

        this.#replyPromiseChain = replyPromise.catch(() => {
            // ignore error in next calls
        });

        return replyPromise;
    }
}
