# Cinnamon
A rewrite of Cinnamon in Typescript, merging the old functionality with the Synonym wordle bot I've been working on.

The main features of the bot are:
 - Wordle Tracking: Parses and maintains a database of wordle results pasted into chat and generates detailed statistics and local/global leaderboards.
 - Roleplay: Has context-based commands to enhance interactions and drive conversations between users
 - Utility: Provides relevant and unique functionalities that (hopefully) have minimal feature overlap with other more popular bots

This is a solo project, and I usually work on this project on-and-off, using it as an opportunity to explore and learn about new things such as Typescript, MongoDB, and Docker. Once I am satisfied with the number of features and general stability of the bot, I might release it for public use.

## Stack
This bot uses Node.js with Typescript, packaged in a Docker container.
 - **API:** Mostly uses `discord.js` to communicate with the Discord API, and `axios` for parts of the API that have not yet been implemented into discord.js
 - **Database:** MongoDB, through the `mongoose` package
 - **Image Processing:** `canvas` is used for image processing and creation, and `gifuct-js` is used for GIF handling and creation.


## Directories
 - `./src/` = source files
   - `./src/config/` = config files
   - `./src/database/` = database logic files
     - `./src/database/models` = database models for records
   - `./src/utils/` = shared utility files
   - `./src/events/` = handles interaction events
   - `./src/interfaces/` = defines interfaces for common structures like commands
   - `./src/commands/` = commands
   - `./src/modules/` = helper modules for database
 - `./prod/` = generated output files
 - `./.env` = environment variables
