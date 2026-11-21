import type { Client, Snowflake } from 'discord.js';
import type { Logger } from '../logger/logger.ts';
import { formatHealthCheckResultMessage } from '../messages/format.ts';
import type { HealthCheckFailure } from './checker.ts';

export const createHealthCheckNotifyAdminChannelResultHandler =
    ({
        client,
        adminChannelId,
        logger,
    }: {
        readonly client: Client;
        readonly adminChannelId: Snowflake;
        readonly logger: Logger;
    }) =>
    async (failures: readonly HealthCheckFailure[]) => {
        if (failures.length === 0) {
            return;
        }

        try {
            const textChannel = await client.channels.fetch(adminChannelId);
            if (!textChannel) {
                throw new Error('Admin channel does not exist');
            }
            if (!textChannel.isSendable()) {
                throw new Error('Admin channel is not sendable');
            }

            await textChannel.send({
                content: formatHealthCheckResultMessage(failures),
            });
        } catch (err) {
            logger.error('Failed to send health check failure notification', {
                err,
            });
        }
    };
