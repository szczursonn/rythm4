# Rythm 4
## Awesome Discord Music Bot
Inspired by late [Rythm](https://rythm.fm/)  
**Requires Node.js 18**

## Table of contents
1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Commands](#commands)
4. [Cookie configuration](#cookie-configuration)

## Installation
```
# Clone this repository
git clone https://github.com/szczursonn/rythm4
cd rythm4

# Install dependencies
npm install

# Create the .env file and set DISCORD_TOKEN, or set the enviroment variables yourself
nano .env

# Start the bot
npm run start-dev
```

## Configuration
Create .env file and set following enviroment variables:
- **DISCORD_TOKEN: Bot token from https://discord.com/developers/applications**
- **PREFIX (optional): Prefix for commands, defaults to `$`**
- **YT_COOKIE (optional): Cookie for accessing age-restricted videos, see [Cookie configuration](#cookie-configuration)**
- **NODE_ENV: Node enviroment, should be set to `production` in production, defaults to `development`**

## Commands
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

## Cookie Configuration
To access age-restricted video, you will have to set YT_COOKIE enviroment variable
1. Navigate to YouTube in a web browser and login
2. Open up dev tools
3. Go to the network tab
4. Click on a request on the left
5. Scroll down to "Request Headers"
6. Find the "cookie" header and copy its entire contents