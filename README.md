# Rythm 4

## Awesome Discord Music Bot

Inspired by late [Rythm](https://rythm.fm/)  
**Requires Node.js 18**

## Table of contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Commands](#commands)
4. [Enable age restricted videos](#enable-age-restricted-videos)

## Installation

```bash
# Clone this repository
git clone https://github.com/szczursonn/rythm4
cd rythm4

# Install dependencies
npm i

# Create the .env file, or set the enviroment variables yourself
nano .env

# Start the bot
npm run dev
```

## Configuration

Create .env file and set following enviroment variables:

-   **DISCORD_TOKEN**: Bot token from https://discord.com/developers/applications
-   **PREFIX** (optional): Prefix for commands, defaults to `$`
-   **YT_COOKIE** (optional): For accessing age-restricted videos, see [Enable age restricted videos](#enable-age-restricted-videos)
-   **YT_TOKEN** (optional): For accessing age-restricted videos, see [Enable age restricted videos](#enable-age-restricted-videos)
-   **NODE_ENV** (optional): Node enviroment, should be set to `production` in production, defaults to `development`

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

### - $pause

Pauses playback

### - $unpause / $resume

Resumes playback

### - $help

Shows the list of the commands

### - $clear

Clears the queue (deletes all items)

### - $status

Show some info about the bot: amount of active sessions, uptime [hh:mm:ss]

### - $slash

Register slash commands on the server (requires admin permissions)

### - $unslash

Unregisters slash commands on the server (requires admin permissions)

## Enable age restricted videos

To access age-restricted video, you will have to set YT_COOKIE and YT_TOKEN enviroment variables

1. Open up Chrome Dev Tools
2. Go to the network tab
3. Go to any video page on Youtube while logged in
4. Click on a request to /playback
5. Go to Headers
6. Find the "cookie" header and copy it
7. Find the "X-Youtube-Identity-Token" header and copy it
