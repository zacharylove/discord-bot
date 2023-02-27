import { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction } from "discord.js";

// Interface for all commands, defines requirements and some additional properties

export interface CommandProperties {
    // Name of command
    Name: string;
    // Any aliases for command
    Aliases?: string[];
    // Whether command is global or guild only
    Scope: "global" | "guild";
    // Whether command is enabled or disabled
    Enabled: boolean;
    // Any intents required for command to function
    Intents?: GatewayIntentBits[];
}


export interface CommandInterface {
    // Holds command data to send to Discord
    data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder;
    // Holds callback function and command logic, must return void promise
    run: (interaction: CommandInteraction) => Promise<void>;

    // Holds information about the command
    properties: CommandProperties;
}