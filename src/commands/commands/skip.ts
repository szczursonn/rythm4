import type { SessionManager } from '../../session/manager.ts';
import { ICON_SUCCESS, ICON_SKIP } from '../../messages/icons.ts';
import { formatTextReplyMessage } from '../../messages/format.ts';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import { doesSessionExistAndPlayingGuard } from '../helpers.ts';

export const createSkipCommands = ({ sessionManager }: { sessionManager: SessionManager }) => {
    const handler = {
        handle: (ctx) =>
            doesSessionExistAndPlayingGuard(ctx, sessionManager, (session) => {
                session.skip();
                return ctx.upsertReply({
                    content: formatTextReplyMessage(ICON_SUCCESS, 'Skipped'),
                });
            }),
    } satisfies HybridCommandHandler;

    return {
        classic: {
            handler,
            aliases: ['skip', 's'],
            help: {
                icon: ICON_SKIP,
                title: 'Skip',
            },
        } satisfies ClassicCommand,
        slash: {
            handler,
            name: 'skip',
            description: 'Skips the current track',
        } satisfies SlashCommand,
    };
};
