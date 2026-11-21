import { type Client, Events, type Message } from 'discord.js';
import type { Logger } from '../../../logger/logger.ts';
import { executeCommandInvocation } from '../../execute.ts';
import type { ClassicCommand } from './command.ts';
import { ClassicCommandInvocationHandlerContext } from './context.ts';

export class ClassicCommandRouter {
    readonly #logger: Logger;
    readonly #commandList: ClassicCommand[] = [];
    readonly #aliasToCommand = new Map<string, ClassicCommand>();
    readonly #clientToPrefix = new Map<Client, string>();

    readonly #messageCreateHandler = this.#handleMessageCreate.bind(this);

    public constructor({ logger }: { logger: Logger }) {
        this.#logger = logger;
    }

    public addClient(client: Client, { prefix }: { prefix: string }) {
        if (this.#clientToPrefix.has(client)) {
            throw new Error('Client was already added');
        }

        this.#clientToPrefix.set(client, prefix);
        client.on(Events.MessageCreate, this.#messageCreateHandler);
    }

    public removeClient(client: Client) {
        if (!this.#clientToPrefix.delete(client)) {
            return;
        }

        client.off(Events.MessageCreate, this.#messageCreateHandler);
    }

    public getPrefix(client: Client) {
        const prefix = this.#clientToPrefix.get(client);
        if (!prefix) {
            throw new Error('Unknown client');
        }
        return prefix;
    }

    public get commands(): readonly ClassicCommand[] {
        return this.#commandList;
    }

    public add(...commands: ClassicCommand[]) {
        for (const command of commands) {
            for (const alias of command.aliases) {
                if (this.#aliasToCommand.has(alias)) {
                    throw new Error(`Duplicate classic command alias: ${alias}`);
                }
            }

            for (const alias of command.aliases) {
                this.#aliasToCommand.set(alias, command);
            }
            this.#commandList.push(command);
        }
    }

    #handleMessageCreate(message: Message) {
        if (message.author.bot || !message.inGuild() || !message.member) {
            return;
        }

        const prefix = this.#clientToPrefix.get(message.client);
        if (!prefix || !message.content.startsWith(prefix)) {
            return;
        }

        let commandNameEndIndex = message.content.indexOf(' ', prefix.length);
        if (commandNameEndIndex === -1) {
            commandNameEndIndex = message.content.length;
        }

        const commandName = message.content.substring(prefix.length, commandNameEndIndex).toLowerCase();
        const argsLine = message.content.substring(commandNameEndIndex).trim();

        const command = this.#aliasToCommand.get(commandName);
        if (!command) {
            return;
        }

        const logger = this.#logger.withAttrs({
            botUserId: message.client.user.id,
            guildId: message.guildId,
            channelId: message.channelId,
            userId: message.author.id,
            command: commandName,
            content: message.content,
        });

        let args;
        try {
            args = command.parseArgs?.(message, argsLine);
        } catch (err) {
            logger.error('Failed to parse command args', {
                err,
            });
            return;
        }

        void executeCommandInvocation(
            command.handler,
            new ClassicCommandInvocationHandlerContext({
                message,
                logger,
                args,
            }),
        );
    }
}
