import type { SessionManager } from '../../session/manager.ts';
import { ICON_QUEUE_CLEAR } from '../../messages/icons.ts';
import { formatTextReplyMessage } from '../../messages/format.ts';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import { doesSessionExistGuard, replyWithUserError } from '../helpers.ts';

export const createClearCommands = ({ sessionManager }: { sessionManager: SessionManager }) => {
    const handler = {
        handle: (ctx) =>
            doesSessionExistGuard(ctx, sessionManager, (session) => {
                if (session.queueSize === 0) {
                    return replyWithUserError(ctx, 'The queue is empty');
                }

                session.clearQueue();
                return ctx.upsertReply({
                    content: formatTextReplyMessage(ICON_QUEUE_CLEAR, 'Queue cleared'),
                });
            }),
    } satisfies HybridCommandHandler;

    return {
        classic: {
            handler,
            aliases: ['clear'],
            help: {
                icon: ICON_QUEUE_CLEAR,
                title: 'Clear',
            },
        } satisfies ClassicCommand,
        slash: {
            handler,
            name: 'clear',
            description: 'Clears the queue',
        } satisfies SlashCommand,
    };
};
