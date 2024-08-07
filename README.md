# Cinnamon
A rewrite of Cinnamon in Typescript, merging the old functionality with the Synonym wordle bot I've been working on.

The features of this bot are divided into two categories:
 - **Commands**: Direct interactions with the user through slash commands or context commands
   - Roleplay: Context-based commands to enhance interactions and drive conversations between users
     - Examples: Ship, poke, hug, etc.
     - Another example is the "confession" command, which allows users to make anonymous posts in a designated channel
   - Utility: Provides relevant and unique functionalities that (hopefully) have minimal feature overlap with other more popular bots
     - Examples: Movie, anime, etc.
     - The music commands stream quality-focused music in voice channels, supporting YouTube, Spotify, and Soundcloud, with plenty of customization.
   - Context Commands: Reaction-focused utilities for driving conversation
     - Find Anime Source: Uses the Trace.moe API to identify source anime shows/movies (with timestamps!) from images and GIFs in a message.
     - Caption Image/GIF: Uses the canvas and gifunct-js packages to apply top and bottom captions to a posted image or GIF.
     - Are These Words In The Bible?: Determines what percentage of words in a message exist in the King James Bible.
 - **Features**: "Passive" interactions through scanning messages (no messages are ever logged)
   - Starboard/Hall of Shame: Collects messages which have received a configurable number of reactions and immortalizes them in their own channel.
   - NYT Wordle/Connections Tracking: Parses and maintains a database of NYT game results pasted into chat and generates detailed statistics and local/global leaderboards.
   - Embed Fixes: Automatically fixes embedding of Twitter/X, Instagram, and TikTok post URLs
   - Custom Responses: Responds to specific messages or regex patterns with user-defined replies
   - Question Of The Day (QOTD): Posts user-created conversation prompts to a designated channel and opens a thread for discussion.

Each command and feature can be configured and toggled on/off on a per-server basis through the "settings" command.

This is a solo project, and I usually work on this project on-and-off, using it as an opportunity to explore and learn about new things such as Typescript, MongoDB, and Docker.
I add features that I think would be fun or useful between me and my friends; as such, this bot is not designed to be used on a large number of servers. 
I made this repository public on 11/21/2023 to show to some friends, but keep in mind that there is a good bit of spaghetti code in here which I plan to continue improving on as I further learn and develop the bot.

## Stack
This bot uses Node.js with Typescript, packaged in a Docker container.
 - **API:** Mostly uses `discord.js` to communicate with the Discord API, and `axios` for parts of the API that have not yet been implemented into discord.js
   - Makes use of [TMDb](https://www.themoviedb.org), [YouTube](https://developers.google.com/youtube/v3), [IGDb](https://api-docs.igdb.com), [Jikan](https://jikan.moe/), [Hardcover](https://hardcover.app/), [Spotify](https://developer.spotify.com/documentation/web-api), and [Trace.moe](https://trace.moe/) APIs.
 - **Database:** MongoDB, through the `mongoose` package
 - **Image Processing:** `canvas` is used for image processing and creation, and `gifuct-js` is used for GIF handling and creation.
 - **Music:** [ytdl-core](https://www.npmjs.com/package/ytdl-core) is used in conjunction with the YouTube and Spotify APIs for downloading YouTube videos and generic streams. [play-dl](https://www.npmjs.com/package/play-dl) is used for parsing and downloading SoundCloud tracks.

## Configuration
Most general bot configuration happens in the `/src/config/config.json` file. Server and user-specific configuration is stored, updated, and retrieved from a MongoDB database, and can be modified through the bot using the `/settings` command.
All sensitive information such as tokens and keys are stored in a `.env` file. There is an `example.env` file included in the repository which shows which keys/tokens/secrets you may need.
 - You don't need all of the API keys to run the bot; if some are missing, the features/commands associated with them will be disabled on startup.

## Usage
Make sure the latest version of Node.js is installed.
Run `npm i` and then `npm run deploy`
 - MacOS requires additional libraries for the `node-canvas` package, which can be installed via Homebrew with `brew install pkg-config cairo pango libpng jpeg giflib librsvg`.

## Docker
I am using Github Actions to compile and publish a Docker container on every commit to the master branch, which can be pulled from `ghcr.io/zacharylove/discord-bot:master`. Make sure to define all of the values in `example.env` as environment variables in the container before running.


## Attribution
The music functionality is inspired by (and in most cases directly ripped from) [codetheweb/muse](https://github.com/codetheweb/muse)
Thank you to the developer of the [aeiou bot](https://github.com/aeioubot/aeiouy) for assisting with the custom responses feature!
