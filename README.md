# Rythm 4

## Awesome Discord Music Bot

Inspired by [Rythm](https://rythm.fm/)  
**Requires at least Node.js 23.6.0**

## Installation

```bash
# Clone this repository
git clone https://github.com/szczursonn/rythm4
cd rythm4

# Install dependencies
npm install

# Create the config file and set values
nano config.toml

# Start the bot ("bun start" prevents graceful shutdown)
npm start
```

## Configuration

Create config.toml file and set following values:

-   **discord_token**: Bot token from https://discord.com/developers/applications
-   **command_prefix** (optional): Prefix for commands, defaults to `!`
-   **debug** (optional): If true, enables debug logging
-   **youtube_cookie** (optional): youtube cookie for accessing age-restricted videos and improved stability
-   **activity_update_interval** (optional): how often to rotate activities
-   **\[\[activities\]\]**: list of activities to rotate through
    -   **name**: name of activity
    -   **type**: activity type, as seen in discord docs ("PLAYING", "LISTENING", etc.)
