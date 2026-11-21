import type { SessionManager } from '../../session/manager.ts';
import { ICON_LOOP_ON, ICON_LOOP_OFF, ICON_LOOP } from '../../messages/icons.ts';
import { formatTextReplyMessage } from '../../messages/format.ts';
import type { HybridCommandHandler } from '../command.ts';
import type { ClassicCommand } from '../sources/classic/command.ts';
import type { SlashCommand } from '../sources/slash/command.ts';
import { doesSessionExistAndPlayingGuard } from '../helpers.ts';

export const createLoopCommands = ({ sessionManager }: { sessionManager: SessionManager }) => {
    const handler = {
        handle: (ctx) =>
            doesSessionExistAndPlayingGuard(ctx, sessionManager, (session) => {
                session.looping = !session.looping;
                return ctx.upsertReply({
                    content: session.looping
                        ? formatTextReplyMessage(ICON_LOOP_ON, `Looping on`)
                        : formatTextReplyMessage(ICON_LOOP_OFF, 'Looping off'),
                });
            }),
    } satisfies HybridCommandHandler;

    return {
        classic: {
            handler,
            aliases: ['loop'],
            help: {
                icon: ICON_LOOP,
                title: 'Loop',
            },
        } satisfies ClassicCommand,
        slash: {
            handler,
            name: 'loop',
            description: 'Toggles looping of the current track',
        } satisfies SlashCommand,
    };
};
