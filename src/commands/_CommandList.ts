// Keeps track of all commands as an array

import { CommandInterface, Feature } from "../interfaces/Command.js"
import { animAvatarTest } from "./animAvatarTest.js";
import { anime } from "./slashCommands/anime.js";
import { avatar } from "./slashCommands/avatar.js";
import { caption } from "./contextCommands/caption.js";
import { confess } from "./slashCommands/confession.js";
import { guildSettings } from "./slashCommands/guildSettings.js";
import { movie } from "./slashCommands/movie.js";
import { petPet } from "./slashCommands/petpet.js";
import { poke } from "./slashCommands/poke.js";
import { ship } from "./slashCommands/ship.js";
import { starboard } from "./slashCommands/starboard.js";
import { stats } from "./slashCommands/stats.js";
import { wordleStats } from "./slashCommands/wordle/wordleStats.js";
import { playSong } from "./slashCommands/music/play.js";
import { skipSong } from "./slashCommands/music/skip.js";
import { stopSong } from "./slashCommands/music/stop.js";
import { queue } from "./slashCommands/music/queue.js";
import { shuffleQueue } from "./slashCommands/music/shuffle.js";
import { clearQueue } from "./slashCommands/music/clear.js";
import { nowPlaying } from "./slashCommands/music/nowplaying.js";
import { pause, resume } from "./slashCommands/music/pauseResume.js";
import { playWordle } from "./slashCommands/wordle/playWordle.js";

// List of all commands registered to the bot
// These commands are registered to Discord when the bot starts
export const CommandList: CommandInterface[] = [
    // Add commands here
    poke,
    avatar,
    wordleStats,
    ship,
    animAvatarTest,
    guildSettings,
    stats,
    confess,
    starboard,
    petPet,
    movie,
    anime,
    caption,
    playSong,
    skipSong,
    stopSong,
    queue,
    shuffleQueue,
    clearQueue,
    nowPlaying,
    pause,
    resume,
    playWordle
];

export default CommandList;


/**
 * Map of features to associated commands
 * Used to batch enable/disable commands when feature is enabled/disabled
 */
export const FeatureCommandMap: Map<Feature, CommandInterface[]> = new Map([
    // Wordle (does not include playwordle)
    [Feature.Wordle, [
        wordleStats
    ]],
    // Music
    [Feature.Music, [
        playSong, skipSong, stopSong, queue, shuffleQueue, clearQueue, nowPlaying, pause, resume
    ]],
    // Starboard
    [Feature.Starboard, [
        starboard
    ]],
    // Confession
    [Feature.Confession, [
        confess
    ]],
    // TwitterEmbedFix
    [Feature.TwitterEmbedFix, [

    ]],
    // TikTokEmbedFix
    [Feature.TikTokEmbedFix, [
        
    ]]
]);


export const toggleMusicCommands = (enabled: boolean) => {
    for (const command of CommandList) {
        if (command.properties.Feature == Feature.Music) {
            command.properties.Enabled = enabled;
        }
    }
}

export const toggleWordlecommands = (enabled: boolean) => {
    for (const command of CommandList) {
        if (command.properties.Feature == Feature.Wordle) {
            command.properties.Enabled = enabled;
        }
    }
}
