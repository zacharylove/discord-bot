# Overview
Cinnamon is a Discord bot written in Typescript that aims to spice up interactions between users and provide features that have minimal overlap with other more established bots.

Cinnamon is completely open-source; the code can be viewed at the [Github Repository](https://github.com/zacharylove/discord-bot). You can also clone the repository and host your own instance of Cinnamon.

This site serves as a reference for features and commands available within Discord. 

## Structure
The features provided by Cinnamon are split into two categories- **Features** and **Commands**. Both can be enabled or disabled by a server administrator using the `/settings <command/feature> <enable/disable>` command.

**Commands** occur from direct interactions such as slash commands or context menu commands, and are the main method for users to interact with the bot.

**Features** are "passive" functionalities which can occur without user interaction, such as scanning channels for messages matching a certain pattern. Some commands exist only to support features- if a feature is disabled, all of its corresponding commands will be disabled as well.

## Stack
Cinnamon is written in [Typescript](https://www.typescriptlang.org/) using [Node.js](https://nodejs.org/en), and is packaged and deployed in a [Docker](https://www.docker.com/) container.

User and guild data are stored in a [MongoDB](https://www.mongodb.com/) database using [Mongoose](https://mongoosejs.com/).

[Canvas](https://www.npmjs.com/package/canvas) is used to generate images for commands, and [gifunct.js](https://www.npmjs.com/package/gifuct-js) is used with a custom version of [gif-encoder-2](https://github.com/benjaminadk/gif-encoder-2) (altered to work with ES2020 Javascript) to parse and generate animated GIFs.


#### API
Cinnamon mainly communicates with the Discord API using [discord.js](https://discord.js.org/).

[Axios](https://www.npmjs.com/package/axios) is used to communicate with other APIs and parts of the Discord API that have not yet been implemented into discord.js.

Cinnamon optionally makes use of the [TMDb](https://www.themoviedb.org)\*, [YouTube](https://developers.google.com/youtube/v3)\*, [IGDb](https://api-docs.igdb.com), [Jikan](https://jikan.moe/), and [Spotify](https://developer.spotify.com/documentation/web-api)\* APIs for info commands and music functionality.

> \* = Requires access credentials through a developer account

#### Voice/Music
Cinnamon uses [spotify-uri](https://www.npmjs.com/package/spotify-uri) and [get-youtube-id](https://www.npmjs.com/package/get-youtube-id) to convert music bot queries into YouTube videos, then downloads them using [ytdl-core](https://www.npmjs.com/package/ytdl-core) and parses them using [FFmpeg](https://ffmpeg.org) (provided by [ffmpeg-static](https://www.npmjs.com/package/ffmpeg-static)) and [libsodium](https://www.npmjs.com/package/libsodium) (through [libsodium-wrappers](https://www.npmjs.com/package/libsodium-wrappers)). Lastly, it transmits an Opus-codec audio stream to the voice channel through [@discordjs/opus](https://www.npmjs.com/package/@discordjs/opus) and [@discordjs/voice](https://www.npmjs.com/package/@discordjs/voice) using a filesystem buffer provided by [fs-capacitor](https://www.npmjs.com/package/fs-capacitor).


# Hosting
You can run your own instance of Cinnamon by cloning the [Github Repository](https://github.com/zacharylove/discord-bot) and following the quick-start guide on this page. This is useful for people looking to host their own version of Cinnamon or developers looking to contribute to the project.

## Getting Started
Before starting, ensure that the latest version of [Node.js](https://nodejs.org/en) is installed.

 > **Note:** MacOS requires additional libraries for the `node-canvas` package, which can be installed via Homebrew with `brew install pkg-config cairo pango libpng jpeg giflib librsvg`.

Also ensure that you have set up a new bot application through the [Discord Developer Portal](https://discord.com/developers/applications). You will need the bot token from this site.

Ensure that you have [set up a MongoDB database](https://www.mongodb.com/basics/create-database). I use [MongoDB Atlas](https://www.mongodb.com/atlas/database), but any MongoDB server will do. You will need the database's connection URI (which includes your username and password).

## Configuration
Before running, you need to specify some credentials by creating a `.env` file in the root directory of the application. You can look at the provided `example.env` as a reference.

##### Required
The bot will not run unless these variables are provided.

 - `BOT_TOKEN` - Your Discord bot token, created through the [Discord Developer Portal](https://discord.com/developers/applications)
 - `DEBUG_MODE: <true/false>` - Whether to launch the bot in "debug mode", which displays additional output that is helpful for testing and debugging. It's a lot of output, so you want to set this to false before running in a production environment.
 - `MONGO_URI` - A MongoDB connection string with the following structure: `mongodb+srv://<username>:<password>@<database url>/?<additional parameters>`.

##### Optional
If any of these variables are not provided, the bot will start normally and disable any commands/features that require the missing variables.

 - `GUILD_ID` - The ID of a Discord server used for testing. In the event that commands fail to register globally, they will still be available in this server.
 - `OWNER_ID` - The user ID of a Discord user. This user will be able to use all bot commands/features, even if they do not have the required permissions. Additionally, this user can use owner-only commands.
 - `TICK_INTERVAL` - Time (in ms) between each tick event for the bot. Currently unused.
 - `MOVIEDB_ACCESS_TOKEN` - An access token for [The Movie DB](https://www.themoviedb.org) API. Used for info commands.
 - `GOOGLE_API_KEY` - An access key for the [YouTube API](https://developers.google.com/). Required for music bot functionality and book commands.
    - APIs used are YouTube and Google Books.
 - `SPOTIFY_CLIENT_ID` - A client ID for the [Spotify Web API](https://developer.spotify.com/documentation/web-api). Required for music bot functionality.
 - `SPOTIFY_CLIENT_SECRET` - A client secret for the [Spotify Web API](https://developer.spotify.com/documentation/web-api). Required for music bot functionality.
  - `HARDCOVER_API_KEY` - An access key for the [Hardcover API](https://hardcover.app/account/api). Used for book commands, but if not present then the Google Books API will be used as a fallback.


## Local Setup

1. Use git, Github CLI, or Github Desktop to clone the [Github Repository](https://github.com/zacharylove/discord-bot) for Cinnamon.

2. Open a terminal and `cd` into the newly-created `discord-bot` directory. 

3. Install Node.js dependencies by running `npm install`.

4. Create a `.env` file using the structure provided by `example.env`.
 - You can optionally configure the bot by editing the `/src/config/config.json` file.

5. Run `npm run deploy` in your terminal to build and deploy the bot.
 - The bot will run through a series of checks to determine whether it has been set up correctly. Check your console output to see if anything needs to be changed.

If all goes well, you will see "Bot ready" in the terminal and your bot should be online!

## Docker Setup
I am using Github Actions to compile and publish a Docker container on every commit to the master branch, which can be pulled from `ghcr.io/zacharylove/discord-bot:master`. 

Make sure to define all of the values in example.env as environment variables in the container before running.