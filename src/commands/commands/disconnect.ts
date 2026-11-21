import type { SessionManager } from '../../session/manager.ts';
import { ICON_LEAVE } from '../../messages/icons.ts';
import { formatTextReplyMessage } from '../../messages/format.ts';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import { doesSessionExistGuard } from '../helpers.ts';

export const createDisconnectCommands = ({ sessionManager }: { sessionManager: SessionManager }) => {
    const handler = {
        handle: (ctx) =>
            doesSessionExistGuard(ctx, sessionManager, (session) => {
                session.destroy();
                return ctx.upsertReply({
                    content: formatTextReplyMessage(ICON_LEAVE, 'Bye!'),
                });
            }),
    } satisfies HybridCommandHandler;

    return {
        classic: {
            handler,
            aliases: ['disconnect', 'dc', 'fuckoff'],
            help: {
                icon: ICON_LEAVE,
                title: 'Disconnect',
            },
        } satisfies ClassicCommand,
        slash: {
            handler,
            name: 'disconnect',
            description: 'Stops playback and leaves the voice channel',
        } satisfies SlashCommand,
    };
};
