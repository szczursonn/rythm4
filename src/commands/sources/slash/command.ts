import type { APIApplicationCommandOption, AutocompleteInteraction, ChatInputCommandInteraction } from 'discord.js';
import type { HybridCommandHandler } from '../../command.ts';

export type SlashCommand<TArgs = unknown> = {
    readonly handler: HybridCommandHandler<TArgs>;
    readonly name: string;
    readonly description: string;
    readonly options?: readonly APIApplicationCommandOption[];
    parseArgs?(interaction: ChatInputCommandInteraction | AutocompleteInteraction): TArgs;
};
