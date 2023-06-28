import {
    ActivityType,
    ChannelType,
    Client,
    CommandInteraction,
    EmbedBuilder,
    GuildMember,
    Interaction,
    Message,
    TextChannel,
} from 'discord.js';
import logger from './logger';
import config from './config';
import SessionManager from './SessionManager';
import { aliasToCommandsMap } from './commands';

type ReplyCallback = (message: string | EmbedBuilder) => Promise<void>;

const PRESENCE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000; // every 24h

export class MusicBot {
    public readonly client: Client;
    public readonly sessions: SessionManager;

    public constructor() {
        this.client = new Client({
            intents: [
                'Guilds',
                'GuildVoiceStates',
                'GuildMessages',
                'MessageContent',
            ],
        });
        this.sessions = new SessionManager();

        logger.info('Logging into Discord...');
        this.client.login(config.discordToken).catch((err) => {
            logger.fatal('Failed to login:', err);
            process.exit();
        });

        this.client.once('ready', (client) => {
            logger.info(`Logged in as ${client.user.tag}`);

            this.setPresence();
            setInterval(() => {
                this.setPresence();
            }, PRESENCE_REFRESH_INTERVAL_MS).unref();
        });

        this.client.on('warn', logger.warn);
        this.client.on('error', logger.error);

        this.client.on('interactionCreate', this.handleInteraction.bind(this));
        this.client.on('messageCreate', this.handleMessage.bind(this));
    }

    private async handleMessage(message: Message) {
        if (
            !message.content.startsWith(config.prefix) ||
            message.channel.type !== ChannelType.GuildText ||
            !message.guildId ||
            message.author.bot ||
            !message.member
        ) {
            return;
        }

        const args = message.content
            .trim()
            .substring(config.prefix.length)
            .split(' ')
            .map((arg) => arg.trim())
            .filter((arg) => arg !== '');
        const commandName = args.shift()?.toLowerCase() || '';

        const reply: ReplyCallback = async (replyMessage) => {
            if (
                !(message.channel as TextChannel)
                    .permissionsFor(message.guild!.members.me!)
                    .has('SendMessages')
            ) {
                return;
            }
            try {
                message.channel.send(
                    typeof replyMessage === 'string'
                        ? replyMessage
                        : { embeds: [replyMessage] }
                );
                logger.debug(
                    'Replied to message: ',
                    typeof replyMessage === 'string'
                        ? `"${replyMessage}"`
                        : '[embed]',
                    `(${(message.channel as TextChannel).name}@${
                        message.guild?.name
                    })`
                );
            } catch (err) {
                logger.error(
                    `Failed to reply to message: `,
                    err,
                    `(${(message.channel as TextChannel).name}@${
                        message.guild?.name
                    })`
                );
            }
        };

        this.processCommand(commandName, args, message.member, reply);
    }

    private async handleInteraction(interaction: Interaction) {
        if (
            !(interaction instanceof CommandInteraction) ||
            !interaction.guildId ||
            !(interaction.member instanceof GuildMember)
        )
            return;

        const commandName = interaction.commandName;
        const args = interaction.options.data
            .map((option) => option.value?.toString())
            .filter((value) => value !== undefined) as Array<string>;

        try {
            await interaction.deferReply();
        } catch (err) {}

        const reply: ReplyCallback = async (replyMessage) => {
            try {
                await interaction.followUp(
                    typeof replyMessage === 'string'
                        ? replyMessage
                        : { embeds: [replyMessage] }
                );
                logger.debug(
                    'Replied to interaction: ',
                    typeof replyMessage === 'string'
                        ? `"${replyMessage}"`
                        : '[embed]',
                    `(${(interaction.channel as TextChannel).name}@${
                        interaction.guild?.name
                    })`
                );
            } catch (err) {
                logger.error(
                    `Failed to reply to interaction: `,
                    err,
                    `(${(interaction.channel as TextChannel)?.name}@${
                        interaction.guild?.name
                    })`
                );
            }
        };

        this.processCommand(commandName, args, interaction.member, reply);
    }

    private async processCommand(
        commandName: string,
        args: string[],
        sender: GuildMember,
        reply: ReplyCallback
    ) {
        const command = aliasToCommandsMap.get(commandName);
        if (!command) {
            await reply(':x: **Invalid command**');
            return;
        }

        try {
            logger.debug(
                `Handling command "${config.prefix}${commandName}${
                    args.length === 0 ? '' : ' ' + args.join(' ')
                }" (${sender.user.tag}@${sender.guild.name})`
            );
            await command.handler({
                bot: this,
                args,
                sender,
                reply,
            });
        } catch (err) {
            logger.error(
                `${config.prefix}${commandName} Command handler failed: `,
                err
            );
            await reply('🚩 **Fatal error**');
        }
    }

    private setPresence() {
        const activityName = `${config.prefix}help`;
        this.client.user?.setPresence({
            activities: [
                {
                    name: activityName,
                    type: ActivityType.Listening,
                },
            ],
        });
        logger.info('Set presence:', activityName);
    }
}
