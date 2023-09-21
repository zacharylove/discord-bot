// Keeps track of all commands as an array

import { CommandInterface } from "interfaces/Command";
import { animAvatarTest } from "./animAvatarTest";
import { anime } from "./slashCommands/anime";
import { avatar } from "./slashCommands/avatar";
import { caption } from "./contextCommands/caption";
import { confess } from "./slashCommands/confession";
import { guildSettings } from "./slashCommands/guildSettings";
import { movie } from "./slashCommands/movie";
import { petPet } from "./slashCommands/petpet";
import { poke } from "./slashCommands/poke";
import { ship } from "./slashCommands/ship";
import { starboard } from "./slashCommands/starboard";
import { stats } from "./slashCommands/stats";
import { wordleStats } from "./slashCommands/wordleStats";

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
    caption
];

export default CommandList;