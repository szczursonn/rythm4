# Rythm 4
## Awesome Discord Music Bot
**Requires Node.js 16+**

### Enviroment Variables:
- **DISCORD_TOKEN: Bot token from https://discord.com/developers/applications**
- **PREFIX: Prefix for commands, defaults to `$`**
- **NODE_ENV: Node enviroment, should be set to `production` in production, defaults to `development`**

## Usage:
```
# Clone this repository
git clone https://github.com/szczursonn/rythm4
cd rythm4

# Install dependencies
npm install

# Build
npm run build

# Create the .env file and set DISCORD_TOKEN, or set the enviroment variables yourself
nano .env

# Start the bot
npm start
```

## Commands:
### - $play / $p <url/searchphrase>
Adds a song or a playlist to the queue, and joins the channel if the bot isn't in one already
### - $disconnect / $dc / $fuckoff
Disconnects the bot from voice channel
### - $queue / $q
Displays the currently playing song, the song queue, whether the player is paused and whether looping is on
### - $skip / $fs / $s
Skips the current song, also disables looping if it's on
### - $loop
Toggles looping of current song
### - $shuffle
Randomizes the order of songs in the queue
### - $pause
Pauses playback
### - $unpause / $resume
Resumes playback
### - $help
Shows the list of the commands
### - $clear
Clears the queue (deletes all items)
### - $status
Show some info about the bot: amount of active sessions, uptime [hh:mm:ss] and current git commit ID
### - $slash
Register slash commands on the server (requires admin permissions)
### - $unslash
Unregisters slash commands on the server (requires admin permissions)