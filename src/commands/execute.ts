import type { ApplicationCommandOptionChoiceData } from 'discord.js';
import type {
    HybridCommandInvocationHandlerContext,
    HybridCommandAutocompleteHandlerContext,
    HybridCommandHandler,
} from './command.ts';
import { replyWithAppError } from './helpers.ts';

export const executeCommandInvocation = async <TArgs>(
    handler: HybridCommandHandler<TArgs>,
    ctx: HybridCommandInvocationHandlerContext<TArgs>,
) => {
    ctx.logger.debug('Handling command...');

    try {
        await handler.handle(ctx);
    } catch (err) {
        ctx.logger.error('Failed to handle command', {
            err,
        });
        try {
            await replyWithAppError(ctx, 'An unexpected error has occurred');
        } catch (replyErr) {
            ctx.logger.warn('Failed to send error reply', {
                err: replyErr,
            });
        }
    } finally {
        ctx.logger.debug('Finished handling command');
    }
};

export const executeCommandAutocomplete = async <TArgs>(
    handler: HybridCommandHandler<TArgs>,
    ctx: HybridCommandAutocompleteHandlerContext<TArgs>,
    respond: (choices: ApplicationCommandOptionChoiceData[]) => Promise<void>,
) => {
    ctx.logger.debug('Handling command autocomplete...');

    try {
        if (!handler.handleAutocomplete) {
            throw new Error('Command does not support autocomplete');
        }
        await respond(await handler.handleAutocomplete(ctx));
    } catch (err) {
        ctx.logger.error('Failed to handle command autocomplete', {
            err,
        });
    } finally {
        ctx.logger.debug('Finished handling command autocomplete');
    }
};
