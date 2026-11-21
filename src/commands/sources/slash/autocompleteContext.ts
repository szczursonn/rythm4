import type { AutocompleteInteraction } from 'discord.js';
import type { Logger } from '../../../logger/logger.ts';
import type { HybridCommandAutocompleteHandlerContext } from '../../command.ts';

export class SlashCommandAutocompleteHandlerContext<TArgs> implements HybridCommandAutocompleteHandlerContext<TArgs> {
    public readonly logger;
    public readonly args;
    public readonly focusedArg;

    readonly #interaction;

    public constructor({
        interaction,
        logger,
        args,
        focusedArg,
    }: {
        interaction: AutocompleteInteraction<'cached'>;
        logger: Logger;
        args: TArgs;
        focusedArg: string;
    }) {
        this.#interaction = interaction;
        this.logger = logger;
        this.args = args;
        this.focusedArg = focusedArg;
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
}
