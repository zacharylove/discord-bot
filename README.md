# Cinnamon
A rewrite of Cinnamon in Typescript, merging the old functionality with the Synonym wordle bot I've been working on.

This is a solo project, and I usually work on this project on-and-off, using it as an opportunity to explore and learn about new things such as Typescript, MongoDB, and Docker.  
I add features that I think would be fun or useful between me and my friends; as such, this bot is not originally designed to be used on a large number of servers.   

I made this repository public on 11/21/2023 to show to some friends, but keep in mind that there is a good bit of spaghetti code in here which I plan to continue improving on as I further learn and develop the bot.

### Commands
> Direct interactions with the user through slash commands or context commands
  - **Roleplay**: Context-based commands to enhance interactions and drive conversations between users
    - Examples: Ship, poke, hug, etc.
  - **Utility**: Provides relevant and unique functionalities that (hopefully) have minimal feature overlap with other more popular bots
    - Search commands like movie, anime, and book query APIs to find a query and shows a list of results.
    - Music commands stream quality-focused music in voice channels, supporting YouTube, Spotify, and Soundcloud, with plenty of customization.
    - Moderators have access to a detailed command log, showing all command interactions over the last 30 days.
  - **Context Commands**: Reaction-focused utilities for driving conversation
    - Find Anime Source: Uses the Trace.moe API to identify source anime shows/movies (with timestamps!) from images and GIFs in a message.
    - Caption Image/GIF: Uses the canvas and gifunct-js packages to apply top and bottom captions to a posted image or GIF.
    - Are These Words In The Bible?: Determines what percentage of words in a message exist in the King James Bible.

### Features
> "Passive" interactions through scanning message content
  - **Starboard/Hall of Shame**: Collects messages which have received a configurable number of reactions and immortalizes them in their own channel.
    - Moderators can customize the reaction emoji, number of reactions required for a starboard post, and which channels that are exempt from message scanning.
  - **NYT Wordle/Connections Tracking**: Parses and maintains a database of NYT game results pasted into chat.
    - Each user's game results are tracked and used to generate weighted rankings on both a per-server and global basis, which can then be viewed through generated infographics.
  - **Embed Fixes**: Automatically fixes embedding of Twitter/X, Instagram, and TikTok post URLs
  - **Custom Responses**: Responds to specific messages or regex patterns with user-defined replies
  - **Question Of The Day (QOTD)**: Posts user-created conversation prompts to a designated channel and opens a thread for discussion.
    - Moderators can define specific roles that can create QOTDs.
  - **Confessions**: Allows users to create anonymous posts whose content can be optionally moderated.
    - Moderators can set up an approval channel, where confessions are initially shown and must be approved before being posted publicly. 
    - Moderators can ban and send messages to confession authors, all without knowing their true identity.

Each command and feature can be configured and toggled on/off on a per-server basis through the "settings" command.


## Stack
This bot uses Node.js with Typescript, packaged in a Docker container.
 - **API:** Mostly uses `discord.js` to communicate with the Discord API, and `axios` for parts of the API that have not yet been implemented into discord.js
   - Makes use of [TMDb](https://www.themoviedb.org), [YouTube](https://developers.google.com/youtube/v3), [IGDb](https://api-docs.igdb.com), [Jikan](https://jikan.moe/), [Hardcover](https://hardcover.app/), [Spotify](https://developer.spotify.com/documentation/web-api), [AllKeyShop](https://www.allkeyshop.com/blog/), [Twitch](https://dev.twitch.tv/docs/api/), and [Trace.moe](https://trace.moe/) APIs.
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
I am using Github Actions to compile and publish a Docker container on every commit to the master branch, which can be pulled from `ghcr.io/zacharylove/discord-bot:master`. 
- Make sure to define all of the values in `example.env` as environment variables in the container before running.
- To access log files, define a folder for the container path `/usr/src/app/logs`.


## Attribution
- The music functionality is inspired by (and in most cases directly ripped from) the [Muse](https://github.com/codetheweb/muse) Discord bot from codetheweb.
- Thank you to the developer of the [aeiou bot](https://github.com/aeioubot/aeiouy) for assisting with the custom responses feature!
- The confession moderation feature is inspired by the [Asagi](https://docs.asagi.xyz/asagi) Discord bot.