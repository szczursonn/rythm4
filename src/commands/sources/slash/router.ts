import {
    type Client,
    Events,
    type Interaction,
    InteractionContextType,
    type RESTPostAPIChatInputApplicationCommandsJSONBody,
    SlashCommandBuilder,
    type Snowflake,
} from 'discord.js';
import type { Logger } from '../../../logger/logger.ts';
import { executeCommandAutocomplete, executeCommandInvocation } from '../../execute.ts';
import type { SlashCommand } from './command.ts';
import { SlashCommandInvocationHandlerContext } from './context.ts';
import { SlashCommandAutocompleteHandlerContext } from './autocompleteContext.ts';

export class SlashCommandRouter {
    readonly #logger: Logger;
    readonly #commandList: SlashCommand[] = [];
    readonly #nameToCommand = new Map<string, SlashCommand>();
    readonly #clients = new Set<Client>();

    readonly #interactionCreateHandler = this.#handleInteractionCreate.bind(this);

    public constructor({ logger }: { logger: Logger }) {
        this.#logger = logger;
    }

    public addClient(client: Client) {
        if (this.#clients.has(client)) {
            throw new Error('Client was already added');
        }

        this.#clients.add(client);
        client.on(Events.InteractionCreate, this.#interactionCreateHandler);
    }

    public removeClient(client: Client) {
        if (!this.#clients.delete(client)) {
            return;
        }

        client.off(Events.InteractionCreate, this.#interactionCreateHandler);
    }

    public get commands(): readonly SlashCommand[] {
        return this.#commandList;
    }

    public add(...commands: SlashCommand[]) {
        for (const command of commands) {
            if (this.#nameToCommand.has(command.name)) {
                throw new Error(`Duplicate slash command name: ${command.name}`);
            }

            this.#nameToCommand.set(command.name, command);
            this.#commandList.push(command);
        }
    }

    public registerSlashCommands(client: Client, guildId: Snowflake | null) {
        return this.#setSlashCommands(
            client,
            this.#commandList.map((command) => {
                const data = new SlashCommandBuilder()
                    .setName(command.name)
                    .setDescription(command.description)
                    .setContexts(InteractionContextType.Guild)
                    .toJSON();
                if (command.options) {
                    data.options = [...command.options];
                }

                return data;
            }),
            guildId,
        );
    }

    public unregisterSlashCommands(client: Client, guildId: Snowflake | null) {
        return this.#setSlashCommands(client, [], guildId);
    }

    async #setSlashCommands(
        client: Client,
        data: readonly RESTPostAPIChatInputApplicationCommandsJSONBody[],
        guildId: Snowflake | null,
    ) {
        if (!client.application) {
            throw new Error('Client application is not available');
        }

        await (guildId ? client.application.commands.set(data, guildId) : client.application.commands.set(data));

        this.#logger.info('Set slash commands', {
            guildId,
            count: data.length,
        });
    }

    #handleInteractionCreate(interaction: Interaction) {
        if (
            !this.#clients.has(interaction.client) ||
            (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) ||
            !interaction.inCachedGuild()
        ) {
            return;
        }

        const command = this.#nameToCommand.get(interaction.commandName);
        if (!command) {
            return;
        }

        const logger = this.#logger.withAttrs({
            botUserId: interaction.client.user.id,
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            command: interaction.commandName,
        });

        let args;
        try {
            args = command.parseArgs?.(interaction);
        } catch (err) {
            logger.error('Failed to parse command args', { err });
            return;
        }

        if (interaction.isChatInputCommand()) {
            void executeCommandInvocation(
                command.handler,
                new SlashCommandInvocationHandlerContext({
                    interaction,
                    logger,
                    args,
                }),
            );
        } else {
            const focusedArg = interaction.options.data.find((o) => o.focused)?.name ?? '';

            void executeCommandAutocomplete(
                command.handler,
                new SlashCommandAutocompleteHandlerContext({
                    interaction,
                    logger,
                    args,
                    focusedArg,
                }),
                (choices) => interaction.respond(choices),
            );
        }
    }
}
