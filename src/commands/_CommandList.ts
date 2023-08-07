// Keeps track of all commands as an array

import { CommandInterface } from "../interfaces/Command";
import { animAvatarTest } from "./animAvatarTest";
import { avatar } from "./avatar";
import { confess } from "./confession";
import { guildSettings } from "./guildSettings";
import { poke } from "./poke";
import { ship } from "./ship";
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
    confess
];

export default CommandList;