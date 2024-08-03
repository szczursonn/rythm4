import {
    APIEmbed,
    CommandInteraction,
    Guild,
    GuildMember,
    GuildTextBasedChannel,
    Message,
    MessageFlags,
    User,
    VoiceBasedChannel,
} from 'discord.js';
import { MusicBot } from '../MusicBot.js';
import play from './play.js';
import clear from './clear.js';
import disconnect from './disconnect.js';
import help from './help.js';
import loop from './loop.js';
import pause from './pause.js';
import queue from './queue.js';
import skip from './skip.js';
import status from './status.js';
import unpause from './unpause.js';
import slash from './slash.js';
import unslash from './unslash.js';
import logger from '../../logger.js';

export type Command = {
    name: string;
    aliases: string[];
    description: string;
    icon: string;
    visibility: 'public' | 'hidden';
    interactionArguments: CommandInteractionArgument[];
    handler: (ctx: CommandHandlerContext) => Promise<void>;
};

// export type CommandHandlerContext = {
//     bot: MusicBot;
//     channel: GuildTextBasedChannel;
//     member: GuildMember;
//     reply: (reply: CommandHandlerContextReply) => Promise<void>;
// } & (
//     | {
//           message: Message;
//           interaction: null;
//       }
//     | {
//           message: null;
//           interaction: CommandInteraction;
//       }
// );

type CommandHandlerContextReply = {
    text?: string;
    embeds?: APIEmbed[];
    ephemeral?: boolean;
    supressEmbeds?: boolean;
    defer?: boolean;
};

// TODO: refactor this shit

export type CommandHandlerContext = CommandHandlerMessageContext | CommandHandlerInteractionContext;

abstract class CommandHandlerContextBase {
    constructor(public readonly bot: MusicBot) {}

    public abstract get guild(): Guild;
    public abstract get channel(): GuildTextBasedChannel;
    public abstract get user(): User;
    public abstract get userVoiceChannel(): VoiceBasedChannel | null;

    private replyMessage: Message | null = null;
    private replyPromiseChain: Promise<void> = Promise.resolve();

    public reply(reply: CommandHandlerContextReply): Promise<void> {
        this.replyPromiseChain = this.replyPromiseChain.finally(async () => {
            try {
                if (this.replyMessage) {
                    if (!this.hasMessagePermissionsForReply) {
                        logger.debug('Reply failed because of missing permissions');
                        return;
                    }

                    this.replyMessage = await this.replyMessage.edit({
                        content: reply.text,
                        embeds: reply.embeds,
                        flags: reply.supressEmbeds ? MessageFlags.SuppressEmbeds : undefined,
                    });
                } else {
                    this.replyMessage = await this.replyInitial(reply);
                }
            } catch (err) {
                logger.error('Failed to reply:', err);
            }
        });

        return this.replyPromiseChain;
    }
    protected abstract replyInitial(reply: CommandHandlerContextReply): Promise<Message | null>;

    public get hasMessagePermissionsForReply() {
        if (!this.guild.members.me) {
            return false;
        }

        return this.channel.permissionsFor(this.guild.members.me).has('SendMessages');
    }
}

export class CommandHandlerMessageContext extends CommandHandlerContextBase {
    constructor(bot: MusicBot, public message: Message<true>, public args: string) {
        super(bot);
    }

    public get guild() {
        return this.message.guild;
    }

    public get channel() {
        return this.message.channel;
    }

    public get user() {
        return this.message.author;
    }

    public get userVoiceChannel() {
        return this.message.member?.voice.channel ?? null;
    }

    protected async replyInitial(reply: CommandHandlerContextReply) {
        if (reply.defer || !this.hasMessagePermissionsForReply) {
            return null;
        }

        return this.message.reply({
            content: reply.text,
            embeds: reply.embeds,
            flags: MessageFlags.SuppressNotifications | (reply.supressEmbeds ? MessageFlags.SuppressEmbeds : 0),
        });
    }
}

export class CommandHandlerInteractionContext extends CommandHandlerContextBase {
    constructor(
        bot: MusicBot,
        public interaction: CommandInteraction & {
            guild: Guild;
            member: GuildMember;
            channel: GuildTextBasedChannel;
        }
    ) {
        super(bot);
    }

    public get guild() {
        return this.interaction.guild;
    }

    public get channel() {
        return this.interaction.channel;
    }

    public get user() {
        return this.interaction.user;
    }

    public get userVoiceChannel() {
        return this.interaction.member.voice.channel;
    }

    private replyDeferred = false;
    protected async replyInitial(reply: CommandHandlerContextReply) {
        if (reply.defer) {
            await this.interaction.deferReply();
            this.replyDeferred = true;
        } else if (this.replyDeferred) {
            return this.interaction.followUp({
                content: reply.text,
                embeds: reply.embeds,
                flags:
                    MessageFlags.SuppressNotifications |
                    (reply.ephemeral ? MessageFlags.Ephemeral : 0) |
                    (reply.supressEmbeds ? MessageFlags.SuppressEmbeds : 0),
            });
        } else {
            await this.interaction.reply({
                content: reply.text,
                embeds: reply.embeds,
                flags:
                    MessageFlags.SuppressNotifications |
                    (reply.ephemeral ? MessageFlags.Ephemeral : 0) |
                    (reply.supressEmbeds ? MessageFlags.SuppressEmbeds : 0),
            });
        }

        return null;
    }
}

export const ICONS = {
    APP_ERROR: ':octagonal_sign:',
    USER_ERROR: ':x:',
} as const;

type CommandInteractionArgument = {
    name: string;
    description: string;
    type: number; // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
    required?: boolean;
};

export const commands: ReadonlyArray<Command> = [
    clear,
    disconnect,
    help,
    loop,
    pause,
    play,
    queue,
    skip,
    status,
    unpause,
    slash,
    unslash,
];

export const aliasToCommandsMap: ReadonlyMap<string, Command> = commands.reduce((map, command) => {
    for (const alias of command.aliases) {
        map.set(alias, command);
    }
    return map;
}, new Map<string, Command>());
