# Rythm 4

## Awesome Discord Music Bot

Inspired by late [Rythm](https://rythm.fm/)  
**Requires Node.js 18**

## Table of contents

1. [Installation](#installation)
2. [Configuration](#configuration)
3. [Commands](#commands)

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

-   **RYTHM4_DISCORD_TOKEN**: Bot token from https://discord.com/developers/applications
-   **RYTHM4_PREFIX** (optional): Prefix for commands, defaults to `$`
-   **RYTHM4_DEBUG** (optional): If not empty, enables debug logging

## Commands

### - $play / $p <url/searchphrase>

Adds a song or a playlist to the queue, and joins the channel if the bot isn't in one already  
Supported formats: youtube search query, youtube video url, youtube playlist url, soundcloud song url

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

Register slash commands on the server

### - $unslash

Unregisters slash commands on the server
