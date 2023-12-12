# Feature List

**Features** are "passive" functionalities which can occur without user interaction, such as scanning channels for messages matching a certain pattern. Some commands exist only to support features- if a feature is disabled, all of its corresponding commands will be disabled as well.

Here you can find a list of features currently available in Cinnamon.

Features are enabled by default. They can be toggled on or off by a server administrator with the following command:
```
/settings feature <enable/disable> <feature name>
```
This will enable or disable the given feature for the server.



## Wordle
Cinnamon scans text channels for results copy/pasted from [Wordle](https://www.nytimes.com/games/wordle/index.html). When a user pastes a result into chat, the bot updates their database entry with the new result and calculates statistics such as guess average and weighted score (which is used for ranking the leaderboard).


##### Commands

| <div style="width:150px">Name</div>   | Type | Description |
|--------|------|-------------|
|`/wordleRanking`| Slash | Displays a global leaderboard of the top Wordle players, based on weighted score. |
|`/wordleStats` | Slash | Displays Wordle statistics for a given user. |
|`/playWordle` | Slash | Creates a practice Wordle game in a new thread. |


##### Required Intents/Permissions

| Name | Type | Reason |
|------|------|--------|
|`Guilds`| Intent | Server access |
|`GuildMessages`| Intent | Accessing messages within a server |
|`MessageContent`| Intent | Scanning messages without user input |
|`Channel`| Partial | Viewing the contents of a server channel |
|`Message` | Partial | Viewing the contents of a message |
|`User` | Partial | Retrieving user information |

## Starboard
Cinnamon scans text channels for message reactions. When a message receives a certain amount of a configurable reaction, the message content is reposted to a designated Starboard channel to immortalize it.


##### Commands

| <div style="width:150px">Name</div>   | Type | Description |
|--------|------|-------------|
|`/starboard setchannel`| Slash | (Admin) Define the channel where starboard messages are posted |
|`/starboard threshold`| Slash | (Admin) Set the number of reactions that a message must receive before being posted to the starboard |
|`/starboard top`| Slash | Displays a ranking of the top most reacted-to messages |
|`/starboard blacklist`| Slash | (Admin) Define a channel that will not be scanned for reactions |
|`/starboard emoji` | Slash | (Admin) Set the emoji that will be used for the starboard |
|`/starboard random` | Slash | Post a random starboard message to the current channel |


##### Required Intents/Permissions

| Name | Type | Reason |
|------|------|--------|
|`Guilds`| Intent | Server access |
|`GuildMessages`| Intent | Accessing messages within a server |
|`GuildMessageReactions`| Intent | Accessing and modifying reactions to messages |
|`Channel`| Partial | Viewing the contents of a server channel |
|`Message` | Partial | Viewing the contents of a message |
|`Reaction` | Partial | Viewing the reactions for a message |
|`User` | Partial | Retrieving user information |


## Music

## Confessions