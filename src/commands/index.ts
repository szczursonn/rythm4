import { EmbedBuilder, GuildMember } from 'discord.js';
import { MusicBot } from '../MusicBot';
import play from './play';
import clear from './clear';
import disconnect from './disconnect';
import help from './help';
import loop from './loop';
import pause from './pause';
import queue from './queue';
import skip from './skip';
import status from './status';
import unpause from './unpause';
import slash from './slash';
import unslash from './unslash';

export type Command = {
    name: string;
    aliases: string[];
    description: string;
    icon: string;
    visibility: 'public' | 'hidden';
    interactionArguments: CommandInteractionArgument[];
    handler: CommandHandler;
};

export type CommandHandler = (args: {
    bot: MusicBot;
    args: string[];
    sender: GuildMember;
    reply: (msg: string | EmbedBuilder) => Promise<void>;
}) => Promise<void>;

type CommandInteractionArgument = {
    name: string;
    description: string;
    type: number; // https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type
    required: boolean;
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

export const aliasToCommandsMap: ReadonlyMap<string, Command> = commands.reduce(
    (map, command) => {
        for (const alias of command.aliases) {
            map.set(alias, command);
        }
        return map;
    },
    new Map<string, Command>()
);
