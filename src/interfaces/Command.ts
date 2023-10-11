import { ContextMenuCommandBuilder, SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder } from "@discordjs/builders";
import { GatewayIntentBits } from "discord-api-types/v9";
import { CommandInteraction, PermissionsBitField } from "discord.js";

export enum Feature {
    Music,
    Wordle,
    Starboard,
    Confession
}

// Interface for all commands, defines requirements and some additional properties
export interface CommandProperties {
    // Name of command
    Name: string;
    // Any aliases for command
    Aliases?: string[];
    // Whether command is global or in test guild only
    Scope: "global" | "guild";
    // Whether command is restricted to guilds (no DMs)
    GuildOnly: boolean;
    // Whether command is globally enabled (used to disable commands temporarily)
    // When this is false, the command cannot be enabled by non-bot developers
    Enabled: boolean;
    // Whether command is enabled by default
    DefaultEnabled: boolean;
    // Whether command can be disabled (default: true)
    CanBeDisabled?: boolean;
    // Any intents required for command to function
    Intents?: GatewayIntentBits[];
    // Any permissions required for command to function
    Permissions?: PermissionsBitField[];
    // Whether response is ephemeral or not
    Ephemeral?: boolean;
    // Whether to defer the reply
    Defer?: boolean;
    // What feature the command belongs to
    Feature?: Feature;
}


export interface CommandInterface {
    // Holds command data to send to Discord
    data: Omit<SlashCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | SlashCommandSubcommandsOnlyBuilder | Omit<ContextMenuCommandBuilder, "addSubcommandGroup" | "addSubcommand"> | ContextMenuCommandBuilder;
    // Holds callback function and command logic, must return void promise
    run: (interaction: CommandInteraction) => Promise<void>;

    // Holds information about the command
    properties: CommandProperties;
}