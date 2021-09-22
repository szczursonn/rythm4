import { AudioPlayerStatus } from "@discordjs/voice"
import { MessageEmbed, MessageOptions } from "discord.js"
import Session from "../Session"
import { formatSongDuration } from "../utils"

export const queueHandler = async (session: Session | undefined, guildName: string , reply: (msg: MessageOptions | string)=>any) => {
    if (!session) {
        await reply(':x: **I am not active on this server**')
        return
    }
    const embed = new MessageEmbed()
    .setTitle(`Queue for ${guildName}`)
    .setColor('#0189df')
    
    if (!session.currentlyPlaying) {
        embed.addFields({
            name: 'There is nothing playing on this server.',
            value: '\u2800',
            inline: false
        })
    } else {
        embed.addFields({
            name: `__Playing now__: ${session.currentlyPlaying.title}${session.audioPlayer.state.status === AudioPlayerStatus.Paused ? ' | PAUSED' : ''}`,
            value: `Length: \`${formatSongDuration(session.currentlyPlaying.duration)}\` | Requested by <@${session.currentlyPlaying.addedBy}>`,
            inline: false
        })
        let queueDuration = 0
        for (let i = 0; i<session.queue.length; i++) {
            const song = session.queue[i]
            queueDuration += song.duration
            if (i < 5) {
                embed.addFields({
                    name: `\`${i+1}.\` ${song.title}`,
                    value: `${song.url}\nLength: \`${formatSongDuration(song.duration)}\` | Requested by <@${song.addedBy}>`,
                    inline: false,
                })
            } else if (i === 5) {
                embed.addFields({
                    name: `and ${session.queue.length-5} more videos queued!`,
                    value: '\u2800',
                    inline: false
                })
            }
        }
        embed.setDescription(`Queue length: **${formatSongDuration(queueDuration)}**\nLooping: ${session.looping ? ':green_circle:' : ':red_circle:'}\nVolume: **${session.volume}**`)
    }

    await reply({embeds: [embed]})
    return
}