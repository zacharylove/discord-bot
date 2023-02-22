import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";


export enum CommandProperties {
    // Name of command
    Name,
    // Whether command is global or guild only
    Scope,
    // Whether command is enabled or disabled
    Enabled,
}

// Defines interface for command
export interface CommandInterface {
    // Holds command data to send to Discord
    data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder;
    // Holds callback function and command logic, must return void promise
    run: (interaction: CommandInteraction) => Promise<void>;

    // Holds information about the command
    properties: Map<CommandProperties, string>;
}