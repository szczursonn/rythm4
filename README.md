# Rythm 4
## Awesome Discord Music Bot
**Requires at least Node.js 16**

### Enviroment Variables:
- **DISCORD_TOKEN: Bot token from https://discord.com/developers/applications**
- **PREFIX: Prefix for commands, defaults to `$`**
- **NODE_ENV: Node enviroment, should be set to `production` in production, defaults to `development`**



## Usage:
```
# Clone production branch from this repository
git clone https://github.com/szczursonn/rythm4 -b prod
cd rythm4

# Install dependencies
npm install

# Build
npm run build

# Create the .env file and set DISCORD_TOKEN, or set enviroment variables yourself
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
Displays the current song, the song queue, whether the player paused and whether the player is looping
### - $skip / $fs / $s
Skip the current song, also disables looping
### - $loop
Toggles the loop
### - $shuffle
Randomizes the queue order
### - $pause
Pauses the player
### - $unpause / $resume
Resumes the player
### - $help
Show the list of the commands
### - $clear
Clears the queue (deletes all items)
### - $status
Show some info about the bot: amount of channels the bot is in, node and discord.js versions, ram usage, uptime and current git commit id