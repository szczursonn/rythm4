import type { Message } from 'discord.js';
import type { HybridCommandHandler } from '../../command.ts';

export type ClassicCommand<TArgs = unknown> = {
    readonly handler: HybridCommandHandler<TArgs>;
    readonly aliases: readonly string[];
    readonly help?: {
        readonly title: string;
        readonly icon: string;
    };
    parseArgs?(message: Message<true>, argsLine: string): TArgs;
};
