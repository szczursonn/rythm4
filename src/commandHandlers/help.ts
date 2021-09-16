import { MessageEmbed, MessageOptions } from "discord.js"

export const helpHandler = async (prefix: string, reply: (msg: MessageOptions | string)=>any) => {
    const embed = new MessageEmbed()
            .setTitle(`List of commands`)
            .setColor('#0189df')
            .setURL('https://github.com/szczursonn/Rythm4/blob/master/Rythm4/README.md')
                .setDescription('Prefix: **' + prefix + '**')
                .addFields(
                    { name: '\:play_pause: Play', value: '**' + prefix + 'play** lub **' + prefix + 'p**', inline: true },
                    { name: '\:track_next: Skip', value: '**' + prefix + 'skip** lub **' + prefix + 's**', inline: true },
                    { name: '\:page_facing_up: Queue', value: '**' + prefix + 'queue** lub **' + prefix + 'q**', inline: true },
                    { name: '\:loudspeaker: Volume', value: '**' + prefix + 'volume** lub **' + prefix + 'vol** lub **' + prefix + 'v**', inline: true },
                    { name: '\:pause_button: Pause', value: '**' + prefix + 'pause**', inline: true },
                    { name: '\:play_pause: Unpause', value: '**' + prefix + 'unpause** lub **' + prefix + 'resume**', inline: true },
                    { name: '\:stop_sign: Disconnect', value: '**' + prefix + 'disconnect** lub **' + prefix + 'dc** lub **' + prefix + 'fuckoff**', inline: true },
                    { name: '\:arrows_counterclockwise: Loop', value: '**' + prefix + 'loop**', inline: true },
                    { name: ':cyclone: Shuffle', value: `**${prefix}shuffle**`, inline: true},
                    { name: '\:question: Help', value: '**' + prefix + 'help**', inline: true },
                )

    reply({embeds: [embed]})
}