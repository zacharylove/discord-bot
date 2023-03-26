// Keeps track of all commands as an array

import { CommandInterface } from "../interfaces/Command";
import { animAvatarTest } from "./animAvatarTest";
import { avatar } from "./avatar";
import { guildSettings } from "./guildSettings";
import { poke } from "./poke";
import { ship } from "./ship";
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
];

/**
 * Gets a list of all command names as strings
 * @returns an array of all command names as strings
 */
export const commandListAsString = () : string[] => {
    return CommandList.map(command => command.properties.Name);
}

export default CommandList;