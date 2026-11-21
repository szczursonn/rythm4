import type { APIEmbed, ApplicationCommandOptionChoiceData, Client, Snowflake } from 'discord.js';
import type { Logger } from '../logger/logger.ts';

export type HybridCommandHandlerBaseContext<TArgs = unknown> = {
    readonly logger: Logger;
    readonly args: TArgs;
    readonly client: Client;
    readonly guildId: Snowflake;
    readonly channelId: Snowflake;
    readonly userId: Snowflake;
};

export type HybridCommandInvocationHandlerContext<TArgs = unknown> = {
    upsertReply(options: {
        readonly content?: string;
        readonly embeds?: readonly APIEmbed[];
        readonly ephemeral?: boolean;
        readonly suppressEmbeds?: boolean;
    }): Promise<void>;
} & HybridCommandHandlerBaseContext<TArgs>;

export type HybridCommandAutocompleteHandlerContext<TArgs = unknown> = {
    readonly focusedArg: string;
} & HybridCommandHandlerBaseContext<TArgs>;

export type HybridCommandHandler<TArgs = unknown> = {
    handle(ctx: HybridCommandInvocationHandlerContext<TArgs>): Promise<void>;
    handleAutocomplete?(
        ctx: HybridCommandAutocompleteHandlerContext<TArgs>,
    ): Promise<ApplicationCommandOptionChoiceData[]>;
};
