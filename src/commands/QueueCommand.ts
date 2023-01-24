import { EmbedBuilder } from "discord.js";
import { Command, CommandHandlerParams } from ".";
import { formatSongDuration } from "../utils";

export class QueueCommand extends Command {
    aliases = ['queue', 'q']
    description = 'Show the song queue'
    icon = '📄'
    hidden = false
    options = undefined

    public async handle( { session, sender, replyHandler }: CommandHandlerParams): Promise<void> {
        if (!session) {
            await replyHandler.reply(':x: **I am not active on this server**')
            return
        }
        
        const guildName = sender.guild.name
    
        const embed = new EmbedBuilder()
        .setTitle(`Queue for ${guildName}`)
        .setColor('#0189df')
        
        const currentSong = session.currentSong
    
        if (!currentSong) {
            embed.addFields({
                name: 'There is nothing playing on this server.',
                value: '\u2800',
                inline: false
            })
        } else {
            embed.addFields({
                name: `__Playing now__: ${currentSong.title}${session.isPaused ? ' | PAUSED' : ''}`,
                value: `Length: \`${formatSongDuration(currentSong.duration)}\` | Requested by <@${currentSong.addedBy}>`,
                inline: false
            })
            let queueDuration = 0
            const queue = session.getQueue()
            for (let i = 0; i<queue.length; i++) {
                const song = queue[i]
                queueDuration += song.duration
                if (i < 5) {
                    embed.addFields({
                        name: `\`${i+1}.\` ${song.title}`,
                        value: `${song.url}\nLength: \`${formatSongDuration(song.duration)}\` | Requested by <@${song.addedBy}>`,
                        inline: false,
                    })
                } else if (i === 5) {
                    embed.addFields({
                        name: `and ${queue.length-5} more videos queued!`,
                        value: '\u2800',
                        inline: false
                    })
                }
            }
            embed.setDescription(`Queue length: **${formatSongDuration(queueDuration)}**\nLooping: ${session.isLooping ? ':green_circle:' : ':red_circle:'}`)
        }
    
        await replyHandler.reply(embed)
        return
    }

}