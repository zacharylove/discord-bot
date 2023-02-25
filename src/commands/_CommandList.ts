// Keeps track of all commands as an array

import { CommandInterface } from "../interfaces/Command";
import { avatar } from "./avatar";
import { poke } from "./poke";

export const CommandList: CommandInterface[] = [
    // Add commands here
    poke,
    avatar
];