# Command List

**Commands** occur from direct interactions such as slash commands or context menu commands, and are the main method for users to interact with the bot.

Here you can find a list of commands currently available in Cinnamon.

Most commands are enabled by default. They can be toggled on or off by a server administrator with the following command:
```
/settings command <enable/disable> <command name>
```
This will enable or disable the given feature for the server.
 > **Note:** Some commands are tied to features, and will also be disabled if the corresponding feature is disabled.

## General Commands
These commands are for general-purpose utility.

### Avatar
```
/avatar <user>
```
Retrieves the global/server-specific avatar and global/server-specific (WIP) banner of a given user in .webp, .png, .jpg, and .jpeg formats.

### Settings
```
/settings [command/feature/help] [enable/disable/list] <command/feature name>
```
(Admin only) Modify server-specific settings and enable/disable commands or features.

##### Subcommands
```
/settings help
```
Displays a list of configuration options available in the `/settings` command.

```
/settings [command/feature] list
```
Lists commands or features that can be enabled or disabled through the `/settings [command/feature] [enable/disable] <command/feature name>` command.

```
/settings [command/feature] [enable/disable] <command/feature name>
```
Enable or disable a command or feature for the given server.


### Stats
```
/stats
```
Displays the following bot statistics:

 - Amount of time bot has been running
 - Total number of servers the bot is currently in
 - Total number of server entries in the database
 - Total number of user entries in the database
 - Total number of commands registered
 - Total number of confessions made
 - Total number of starboard posts made
 - Total number of Wordle results processed
 - Total number of Wordle guesses processed from results
 - Intents required by the bot

---

## Search Commands
These commands search for a query using an API and display any results found.

### Anime
```
/anime <query>
```
Search for a given anime show or movie using the Jikan API.

### Movie
```
/movie <query>
```
Search for a given movie using The Movie DB API
 - ❗ Requires `MOVIEDB_ACCESS_TOKEN` to be defined in `.env`

---

## Roleplay Commands
These commands are interactions that can be made between users to spice up conversation.

### Poke
```
/poke <user>
```
"Poke" a target user, notifying them. Both the number of times the target user has been poked and the number of times the calling user has poked someone is displayed.

 - There are special messages for poking/being poked a certain number of times :)

### Ship
```
/ship <user> <user (optional)>
```
Generates an image displaying a compatibility percentage between two users, with special messages and effects for high numbers.

 - The percentage between two users is determined using user ID and the current date, so it will change every 24 hours.

### Petpet
```
/petpet <user/url> <orientation>
```
Generates a GIF of a hand petting the avatar of a user or a given image URL. Can specify right-handed or left-handed to change the orientation of the hand.

---

## Music Commands
These commands control the **Music** feature, and can only be used when you are currently in a voice channel.

### Play
```
/play <query> next:[true/false] shuffle:[true/false]
```
Searches for the query on Spotify and YouTube and plays the result in the current voice channel. If there are currently songs queued up, the new item is added to the end of the queue.

The following queries are supported:

 - Text - searches YouTube for the given query
 - YouTube video URL - Downloads and queues the given video
 - YouTube playlist URL - Downloads and queues the first 50 videos in the playlist
 - Spotify song URL - Searches for a corresponding YouTube video and queues the result
 - Spotify album URL - Searches for a corresponding YouTube video or playlist and queues the result
 - Spotify playlist URL - Searches for corresponding YouTube videos for the first 50 songs in the playlist, and queues all results.

##### Arguments

 - `next` - When `true`, adds the new item to the front of the queue, where it will play next.
 - `shuffle` - when `true`, will shuffle the queue after adding the new item.


### Pause
```
/pause
```
Pauses the currently playing song until it is resumed with `/resume` or all users leave the current voice channel.

### Resume
```
/resume
```
Resumes playing the current song if the bot is currently paused.

### Skip
```
/skip
```
Immediately stops playing the current song and starts playing the next song on the queue. If the queue is empty, the bot disconnects from the voice channel.

### Stop
```
/stop
```
Stops playing the current song and immediately disconnects from the voice channel.

### Queue
```
/queue
```
Displays a list of songs queued to be played, along with their source and requester.

### Clear
```
/clear
```
Clears the current queue. The current song will continue playing.

### Shuffle
```
/shuffle
```
Shuffles the order of all songs in the queue.

### Now Playing
```
/nowplaying
```
Displays information about the song that is currently playing.

---

## Wordle Commands
Commands related to the word puzzle game Wordle. Only some of these commands are tied to the **Wordle** feature.

### Play Wordle
```
/playwordle public:[true/false] infinite:[true/false] puzzlenum:<number> silent:[true/false] challenge:[true/false]
```
Opens a thread in the current channel where the member(s) can play a game of Wordle. A word is selected from the Wordle word list (unless challenge mode is enabled), and any 5-letter word sent to the thread is considered a guess. 

This does not affect users' Wordle statistics.

After the game ends, the results are posted to the original channel and the thread is deleted.

##### Arguments
 - `public` - When `true`, allows anyone to make guesses in the thread. Displays the username next to each guess, but only the user that guesses the answer correctly gets credit at the end.
 - `infinite` - When `true`, allows the player(s) to make an infinite number of guesses. Helpful when in challenge mode.
 - `puzzlenum` - Define a specific puzzle number to play.
 - `silent` - When `true`, does not post the puzzle results to chat after the game ends.
 - `challenge` - When `true`, selects a 5-letter word from the entire English dictionary instead of using the Wordle word set. This results in some esoteric and challenging puzzles.

### Wordle Statistics
```
/wordlestats <user>
```
Generates a card for a given user's Wordle statistics, based off results previously pasted in chat. Includes their global ranking, weighted score, number of puzzles attempted and completed, and average guesses per game.


### Wordle Ranking (Disabled)
```
/wordleranking
```
Displays a global leaderboard of Wordle players, based on their weighted score.

---

## Confession Commands
These commands control the **Confession** feature, which allows users to anonymously post to a designated channel.

### Confess
```
/confess [new/channel]
```


##### Subcommands
```
/confess new <confession> image:<image url> user:<user to ping>
```
Create a new confession to be posted in the designated confessions channel.

 - `image` (optional) - An image URL to be included in your confession post.
 - `user` (optional) - A user, who is pinged in the confession post.


```
/confess channel <channel>
```
(Admin only) Set a channel where new confessions will be posted to.

---

## Starboard Commands
These commands control the **Starboard** feature, in which messages that receive a certain number of reactions are reposted to a designated starboard channel.

### Blacklist
```
/starboard blacklist <channels>
```
Set channels that will not be scanned for reactions.

### Emoji
```
/starboard emoji emoji:<reaction emoji> success:<success emoji>
```
(Admin only) Set the emoji that will be used for starboard reactions.

##### Arguments
 - `emoji` - The emoji that will be scanned for (default is ⭐). When a message receives that emoji as a reaction a certain number of times, the message is posted to the starboard.
 - `success` - The emoji that is used to indicate a message has been added to the starboard (default is 🌟). When a message is posted to the starboard, the bot reacts to the original post with this emoji.


### Threshold
```
/starboard threshold <count>
```
(Admin only) Set the number of reactions required for a message to be added to the starboard (default is 5).

### Channel
```
/starboard channel <channel>
```
(Admin only) Set the channel to be used as a starboard. When a message reaches a certain number of reactions, it will be reposted there.

### Top
```
/starboard top
```
Displays a leaderboard of posts on the starboard, based on the number of reactions they received.

### Random
```
/starboard random
```
Post a randomly-selected starboard message to the current channel.