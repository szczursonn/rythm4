import {
    type APIEmbed,
    type ApplicationCommandOptionChoiceData,
    type AutocompleteInteraction,
    type ChatInputCommandInteraction,
    Events,
    type Interaction,
    InteractionContextType,
    type Message,
    MessageFlags,
    SlashCommandBuilder,
    type Snowflake,
} from 'discord.js';
import type { Logger } from 'winston';
import type { MusicBot } from '../MusicBot.ts';
import { ERROR_LOG_KEY, formatError } from '../loggerUtils.ts';
import { ICONS } from '../icons.ts';
import { playHybridChatCommand } from './commands/play.ts';
import { skipHybridChatCommand } from './commands/skip.ts';
import { loopHybridChatCommand } from './commands/loop.ts';
import { pauseHybridChatCommand } from './commands/pause.ts';
import { unpauseHybridChatCommand } from './commands/unpause.ts';
import { queueHybridChatCommand } from './commands/queue.ts';
import { helpHybridChatCommand } from './commands/help.ts';
import { slashHybridChatCommand } from './commands/slash.ts';
import { statusHybridChatCommand } from './commands/status.ts';

export type HybridChatCommand<TArgs = unknown> = {
    classic?: {
        aliases: string[];
        helpTitle: string;
        argsParser?: (message: Message, argsLine: string) => TArgs;
    };
    slash?: {
        name: string;
        description: string;
        options?: ReturnType<SlashCommandBuilder['toJSON']>['options'];
        argsParser?: (interaction: ChatInputCommandInteraction | AutocompleteInteraction) => TArgs;
    };
    contexts: {
        dm?: true;
        guild?: true;
    };
    handler: HybridChatCommandHandler<TArgs>;
    autocompleteHandler?: (
        ctx: HybridChatCommandAutocompleteHandlerContext<TArgs>
    ) => Promise<ApplicationCommandOptionChoiceData[]>;
};

export type HybridChatCommandHandler<TArgs = unknown> = (
    ctx: HybridChatCommandHandlerContext<TArgs>
) => Promise<unknown>;

export abstract class HybridChatCommandHandlerContext<TArgs = unknown> {
    public constructor(public readonly bot: MusicBot, public readonly logger: Logger, public readonly args: TArgs) {}

    public abstract get guildId(): Snowflake | null;
    public abstract get channelId(): Snowflake;
    public abstract get userId(): Snowflake;

    public async getGuild() {
        if (this.guildId === null) {
            return null;
        }

        return this.bot.client.guilds.fetch(this.guildId);
    }

    public async getUserMember() {
        const guild = await this.getGuild();
        if (guild === null) {
            return null;
        }

        return guild.members.fetch(this.userId);
    }

    public async getUserVoiceChannel() {
        const member = await this.getUserMember();
        return member?.voice.channel ?? null;
    }

    public abstract upsertReply(arg: {
        content?: string;
        embeds?: APIEmbed[];
        ephemeral?: boolean;
        defer?: boolean;
    }): Promise<void>;
}

class ClassicChatCommandHandlerContext<TArgs> extends HybridChatCommandHandlerContext<TArgs> {
    private replyMessage: Message | null = null;

    public constructor(bot: MusicBot, private readonly message: Message, args: TArgs) {
        super(
            bot,
            bot.logger.child({
                guildId: message.guildId,
                channelId: message.channelId,
                userId: message.author.id,
                messageContent: message.content,
            }),
            args
        );
    }

    public get guildId() {
        return this.message.guildId;
    }

    public get channelId() {
        return this.message.channelId;
    }

    public get userId() {
        return this.message.author.id;
    }

    public async upsertReply({
        content = '',
        embeds = [],
    }: Parameters<HybridChatCommandHandlerContext['upsertReply']>[0]): Promise<void> {
        const flags = MessageFlags.SuppressNotifications | 0;

        if (this.replyMessage === null) {
            this.replyMessage = await this.message.reply({
                content,
                embeds,
                flags,
                failIfNotExists: false,
            });
            this.logger.debug('Message reply sent', {
                content,
                embedsCount: embeds?.length ?? 0,
            });
        } else {
            await this.replyMessage.edit({
                content,
                embeds,
                flags,
            });
            this.logger.debug('Message reply edited', {
                content,
                embedsCount: embeds?.length ?? 0,
            });
        }
    }
}

class SlashChatCommandHandlerContext<TArgs> extends HybridChatCommandHandlerContext<TArgs> {
    public constructor(bot: MusicBot, private readonly interaction: ChatInputCommandInteraction, args: TArgs) {
        super(
            bot,
            bot.logger.child({
                guildId: interaction.guildId,
                channelId: interaction.channelId,
                userId: interaction.user.id,
                commandName: interaction.commandName,
            }),
            args
        );
    }

    public get guildId() {
        return this.interaction.guildId;
    }

    public get channelId() {
        return this.interaction.channelId;
    }

    public get userId() {
        return this.interaction.user.id;
    }

    public async upsertReply({
        content = '',
        embeds = [],
        ephemeral = false,
        defer = false,
    }: Parameters<HybridChatCommandHandlerContext['upsertReply']>[0]): Promise<void> {
        const message = {
            content,
            embeds,
            flags: MessageFlags.SuppressNotifications | (ephemeral ? MessageFlags.Ephemeral : 0),
        };

        if (this.interaction.replied || this.interaction.deferred) {
            await this.interaction.editReply(message);
            this.logger.debug('Interaction reply edited', {
                content,
                embedsCount: embeds.length,
            });
        } else if (defer) {
            await this.interaction.deferReply();
            this.logger.debug('Interaction reply deferred');
        } else {
            await this.interaction.reply(message);
            this.logger.debug('Interaction reply sent', {
                content,
                embedsCount: embeds.length,
            });
        }
    }
}

export class HybridChatCommandAutocompleteHandlerContext<TArgs> {
    public readonly logger: Logger;

    public constructor(
        public readonly bot: MusicBot,
        public readonly interaction: AutocompleteInteraction,
        public readonly args: TArgs
    ) {
        const focusedOption = interaction.options.getFocused(true);

        this.logger = bot.logger.child({
            guildId: interaction.guildId,
            channelId: interaction.channelId,
            userId: interaction.user.id,
            commandName: interaction.commandName,
            option: {
                name: focusedOption.name,
                value: focusedOption.value,
            },
        });
    }
}

export class HybridChatCommandManager {
    private static readonly COMMANDS = [
        playHybridChatCommand,
        skipHybridChatCommand,
        loopHybridChatCommand,
        pauseHybridChatCommand,
        unpauseHybridChatCommand,
        queueHybridChatCommand,
        helpHybridChatCommand,
        slashHybridChatCommand,
        statusHybridChatCommand,
    ] as Readonly<HybridChatCommand[]>;

    private static readonly CLASSIC_ALIAS_TO_COMMAND = this.COMMANDS.reduce((map, chatCommand) => {
        for (const alias of chatCommand.classic?.aliases ?? []) {
            map[alias] = chatCommand;
        }
        return map;
    }, {} as Record<string, HybridChatCommand>) as Readonly<Record<string, HybridChatCommand>>;

    private static SLASH_NAME_TO_COMMAND = this.COMMANDS.reduce((map, chatCommand) => {
        if (chatCommand.slash) {
            map[chatCommand.slash.name] = chatCommand;
        }
        return map;
    }, {} as Record<string, HybridChatCommand>) as Readonly<Record<string, HybridChatCommand>>;

    public constructor(public readonly bot: MusicBot, public readonly classicCommandPrefix: string) {
        this.bot.client.on(Events.MessageCreate, this.handleMessageCreateEvent.bind(this));
        this.bot.client.on(Events.InteractionCreate, this.handleInteractionCreateEvent.bind(this));
    }

    public get commands() {
        return HybridChatCommandManager.COMMANDS;
    }

    public getSlashMetadata() {
        return this.commands
            .filter((cmd) => cmd.slash)
            .map((cmd) => {
                const builder = new SlashCommandBuilder()
                    .setName(cmd.slash!.name)
                    .setDescription(cmd.slash!.description);

                const contexts = [] as InteractionContextType[];
                if (cmd.contexts.dm) {
                    contexts.push(InteractionContextType.BotDM);
                }
                if (cmd.contexts.guild) {
                    contexts.push(InteractionContextType.Guild);
                }
                builder.setContexts(contexts);

                const jason = builder.toJSON();
                jason.options = cmd.slash!.options;

                return jason;
            });
    }

    private handleMessageCreateEvent(message: Message) {
        if (!message.content.startsWith(this.classicCommandPrefix)) {
            return;
        }

        let commandNameEndIndex = message.content.indexOf(' ', this.classicCommandPrefix.length);
        if (commandNameEndIndex === -1) {
            commandNameEndIndex = message.content.length;
        }

        const commandName = message.content.substring(this.classicCommandPrefix.length, commandNameEndIndex);
        const argsLine = message.content.substring(commandNameEndIndex).trim();

        const chatCommand = HybridChatCommandManager.CLASSIC_ALIAS_TO_COMMAND[commandName];
        if (!chatCommand || (message.guildId === null ? !chatCommand.contexts.dm : !chatCommand.contexts.guild)) {
            return;
        }

        this.executeCommand(
            chatCommand,
            new ClassicChatCommandHandlerContext(
                this.bot,
                message,
                chatCommand.classic!.argsParser?.(message, argsLine)
            )
        );
    }

    private handleInteractionCreateEvent(interaction: Interaction) {
        if (!interaction.isChatInputCommand() && !interaction.isAutocomplete()) {
            return;
        }

        const chatCommand = HybridChatCommandManager.SLASH_NAME_TO_COMMAND[interaction.commandName];
        if (!chatCommand || (interaction.guildId === null ? !chatCommand.contexts.dm : !chatCommand.contexts.guild)) {
            return;
        }

        if (interaction.isChatInputCommand()) {
            this.executeCommand(
                chatCommand,
                new SlashChatCommandHandlerContext(this.bot, interaction, chatCommand.slash!.argsParser?.(interaction))
            );
        } else if (chatCommand.autocompleteHandler) {
            this.executeCommandAutocomplete(chatCommand, interaction);
        }
    }

    private async executeCommand<TArgs>(
        chatCommand: HybridChatCommand<TArgs>,
        ctx: HybridChatCommandHandlerContext<TArgs>
    ) {
        ctx.logger.info('Handling classic chat command...');

        try {
            await chatCommand.handler(ctx);
        } catch (err) {
            ctx.logger.error('Failed to handle hybrid chat command', {
                [ERROR_LOG_KEY]: formatError(err),
            });
            await ctx
                .upsertReply({
                    content: `${ICONS.APP_ERROR} **An unexpected error has occured**`,
                    ephemeral: true,
                })
                .catch(() => {});
        } finally {
            ctx.logger.debug('Finished handling hybrid chat command!');
        }
    }

    private async executeCommandAutocomplete(chatCommand: HybridChatCommand, interaction: AutocompleteInteraction) {
        const ctx = new HybridChatCommandAutocompleteHandlerContext(
            this.bot,
            interaction,
            chatCommand.slash!.argsParser?.(interaction)
        );
        ctx.logger.info('Handling slash chat command autocomplete...');

        try {
            const options = (await chatCommand.autocompleteHandler?.(ctx)) ?? [];

            await interaction.respond(options);
        } catch (err) {
            ctx.logger.error('Failed to handle slash chat command autocomplete', {
                [ERROR_LOG_KEY]: formatError(err),
            });
        } finally {
            ctx.logger.debug('Finished handling slash chat command autocomplete!');
        }
    }
}
