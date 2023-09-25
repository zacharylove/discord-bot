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
    playSong
];

export default CommandList;