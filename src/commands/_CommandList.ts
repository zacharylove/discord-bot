// Keeps track of all commands as an array

import { CommandInterface } from "../interfaces/Command";
import { animAvatarTest } from "./animAvatarTest";
import { anime } from "./anime";
import { avatar } from "./avatar";
import { caption } from "./caption";
import { confess } from "./confession";
import { guildSettings } from "./guildSettings";
import { movie } from "./movie";
import { petPet } from "./petpet";
import { poke } from "./poke";
import { ship } from "./ship";
import { starboard } from "./starboard";
import { stats } from "./stats";
import { wordleStats } from "./wordleStats";

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