# Cinnamon
A rewrite of Cinnamon in Typescript, merging the old functionality with the Synonym wordle bot I've been working on.

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
