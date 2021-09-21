import { MessageEmbed, MessageOptions } from "discord.js"

export const helpHandler = async (PREFIX: string, reply: (msg: MessageOptions | string)=>any) => {
    const embed = new MessageEmbed()
            .setTitle(`List of commands`)
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/Rythm4/blob/master/Rythm4/README.md')
                .setDescription('Prefix: **' + PREFIX + '**')
                .addFields(
                    { name: '\:play_pause: Play', value: `**${PREFIX}play** or **${PREFIX}p**`, inline: true },
                    { name: '\:track_next: Skip', value: `**${PREFIX}skip** or **${PREFIX}s**`, inline: true },
                    { name: '\:page_facing_up: Queue', value: `**${PREFIX}queue** or **${PREFIX}q**`, inline: true },
                    { name: '\:loudspeaker: Volume', value: `**${PREFIX}volume** or **${PREFIX}vol**`, inline: true },
                    { name: '\:pause_button: Pause', value: `**${PREFIX}pause**`, inline: true },
                    { name: '\:play_pause: Unpause', value: `**${PREFIX}unpause** or **${PREFIX}resume**`, inline: true },
                    { name: '\:stop_sign: Disconnect', value: `**${PREFIX}disconnect** or **${PREFIX}dc** or **${PREFIX}fuckoff**`, inline: true },
                    { name: '\:arrows_counterclockwise: Loop', value: `**${PREFIX}loop**`, inline: true },
                    { name: ':cyclone: Shuffle', value: `**${PREFIX}shuffle**`, inline: true},
                    { name: '\:question: Help', value: `**${PREFIX}help**`, inline: true },
                )

    reply({embeds: [embed]})
}