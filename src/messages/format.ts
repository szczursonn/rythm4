import { escapeMarkdown } from 'discord.js';
import { ICON_APP_ERROR, ICON_SUCCESS } from './icons.ts';
import type { HealthCheckFailure } from '../healthCheck/checker.ts';
import type { Track } from '../media/media.ts';

export const formatTrackTitle = (title: string | null) => escapeMarkdown(title ?? '<unknown>');

export const formatTrackLink = ({ title, webPageUrl }: Pick<Track, 'title' | 'webPageUrl'>) =>
    webPageUrl ? `[${formatTrackTitle(title)}](${webPageUrl})` : formatTrackTitle(title);

export const formatHHMMSSDuration = (durationMs: number) => {
    const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const mmss = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    return hours > 0 ? `${hours}:${mmss}` : mmss;
};

export const formatTextReplyMessage = (icon: string, message: string) => `${icon} **${message}**`;

const formatHealthCheckResultMessageError = (err: unknown) =>
    err instanceof Error ? [err.name, err.message].filter(Boolean).join(': ') : String(err);

export const formatHealthCheckResultMessage = (failures: readonly HealthCheckFailure[]) =>
    failures.length === 0
        ? formatTextReplyMessage(ICON_SUCCESS, 'Health check successful')
        : [
              formatTextReplyMessage(ICON_APP_ERROR, 'Health check failed'),
              failures.length === 1 ? '1 failure:' : `${failures.length} failures, first one:`,
              `\`${failures[0]?.query}\``,
              `\`\`\`${formatHealthCheckResultMessageError(failures[0]!.error)}\`\`\``,
          ].join('\n');
