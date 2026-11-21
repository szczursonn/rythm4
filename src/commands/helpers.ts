import { type Snowflake } from 'discord.js';
import { SessionLimitReachedError, type SessionManager } from '../session/manager.ts';
import type { Session } from '../session/session.ts';
import { ICON_APP_ERROR, ICON_USER_ERROR } from '../messages/icons.ts';
import { formatTextReplyMessage } from '../messages/format.ts';
import type { HybridCommandInvocationHandlerContext } from './command.ts';

export const replyWithUserError = (ctx: HybridCommandInvocationHandlerContext, message: string) =>
    ctx.upsertReply({
        content: formatTextReplyMessage(ICON_USER_ERROR, message),
        ephemeral: true,
    });

export const replyWithAppError = (ctx: HybridCommandInvocationHandlerContext, message: string) =>
    ctx.upsertReply({
        content: formatTextReplyMessage(ICON_APP_ERROR, message),
        ephemeral: true,
    });

export const isAdminChannelGuard = async <TArgs>(
    ctx: HybridCommandInvocationHandlerContext<TArgs>,
    adminChannelId: Snowflake,
    handler: () => Promise<void>,
) => {
    if (ctx.channelId !== adminChannelId) {
        await replyWithUserError(ctx, 'You cannot use this command here');
        return;
    }
    await handler();
};

export const doesSessionExistGuard = async <TArgs>(
    ctx: HybridCommandInvocationHandlerContext<TArgs>,
    sessionManager: SessionManager,
    handler: (session: Session) => Promise<void>,
) => {
    const session = sessionManager.get(ctx.client, ctx.guildId);
    if (!session) {
        await replyWithUserError(ctx, 'I am not active on this server');
        return;
    }
    await handler(session);
};

export const doesSessionExistAndPlayingGuard = async <TArgs>(
    ctx: HybridCommandInvocationHandlerContext<TArgs>,
    sessionManager: SessionManager,
    handler: (session: Session) => Promise<void>,
) =>
    doesSessionExistGuard(ctx, sessionManager, async (session) => {
        if (!session.currentTrack) {
            await replyWithUserError(ctx, 'Nothing is currently playing');
            return;
        }

        await handler(session);
    });

export const getOrCreateSessionGuard = async <TArgs>(
    ctx: HybridCommandInvocationHandlerContext<TArgs>,
    sessionManager: SessionManager,
    handler: (session: Session) => Promise<void>,
) => {
    let session = sessionManager.get(ctx.client, ctx.guildId);
    if (!session) {
        const guild = await ctx.client.guilds.fetch(ctx.guildId);
        const member = await guild.members.fetch(ctx.userId);

        const voiceChannel = member.voice.channel;
        if (!voiceChannel) {
            await replyWithUserError(ctx, 'You must be in a voice channel');
            return;
        }

        try {
            session = sessionManager.create({
                voiceChannel,
                notificationChannelId: ctx.channelId,
            });
        } catch (err) {
            if (err instanceof SessionLimitReachedError) {
                await replyWithUserError(ctx, 'I am too busy right now, try again later');
                return;
            }
            throw err;
        }
    }

    await handler(session);
};
