// Keeps track of all commands as an array

import { CommandInterface } from "../interfaces/Command.js"
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
import { wordleStats } from "./slashCommands/wordleStats.js";
import { playSong } from "./music/play.js";
import { skipSong } from "./music/skip.js";
import { stopSong } from "./music/stop.js";
import { queue } from "./music/queue.js";
import { shuffleQueue } from "./music/shuffle.js";
import { clearQueue } from "./music/clear.js";
import { nowPlaying } from "./music/nowplaying.js";
import { pause, resume } from "./music/pauseResume.js";

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
];

export default CommandList;

export const toggleMusicCommands = (enabled: boolean) => {
    playSong.properties.Enabled = enabled;
    skipSong.properties.Enabled = enabled;
    stopSong.properties.Enabled = enabled;
    queue.properties.Enabled = enabled;
    shuffleQueue.properties.Enabled = enabled;
    clearQueue.properties.Enabled = enabled;
    nowPlaying.properties.Enabled = enabled;
    pause.properties.Enabled = enabled;
    resume.properties.Enabled = enabled;
}