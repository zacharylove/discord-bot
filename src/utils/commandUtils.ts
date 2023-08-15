// Utility function for commands

import { CommandInteraction, InteractionReplyOptions, MessagePayload } from "discord.js";
import CommandList from "../commands/_CommandList";
import { getGuildDataByGuildID } from "../database/guildData";
import { CommandInterface } from "../interfaces/Command";

/**
 * Get a list of all (non-globally-disabled) commands.
 * Use this as an interface instead of directly accessing CommandList
 * @returns List of CommandInterface objects
 */
export const getCommandList = (): CommandInterface[] => {
    return CommandList.filter(command => command.properties.Enabled);
}

/**
 * Gets a list of all (available) command names as strings
 * @returns an array of all command names as strings
 */
export const getCommandListAsString = () : string[] => {
    return getCommandList().map(command => command.properties.Name);
}



/**
 * Determines whether a given command is disabled in the given guild
 * @param command 
 * @param guildID 
 * @returns true if command is disabled globally or in the given guild, false if command is enabled globally and not disabled in the given guild
 */
export const isCommandDisabled = async (command: CommandInterface, guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    const enabledGlobally: boolean = command.properties.Enabled;
    const enabledByDefault: boolean = command.properties.DefaultEnabled;
    const enabledInGuild: boolean = guildData.commands.enabledCommands.includes(command.data.name);
    const disabledInGuild: boolean = guildData.commands.disabledCommands.includes(command.data.name);
    let cannotBeDisabled: boolean = false;
    if ( command.properties.CanBeDisabled === false ) cannotBeDisabled = true;



    
    // Disabled globally = disabled
    if ( !enabledGlobally ) { return true; }


    if ( enabledByDefault && cannotBeDisabled ) return false;
    if ( enabledByDefault && !disabledInGuild ) return false;
    if ( !enabledByDefault && enabledInGuild ) return false;
    if ( !enabledByDefault && !enabledInGuild ) return true;
    if ( disabledInGuild ) return true;

    console.error("CommandUtils.isCommandDisabled() failed to determine whether command is disabled. This should never happen. Please report this bug to the bot owner.");
    return false;
}

/**
 * Determines whether a given command is enabled in the given guild
 * Globally enabled commands are enabled UNLESS they are specifically disabled
 * @param command 
 * @param guildID 
 * @returns true if command is enabled globally and not disabled in the given guild, false if command is disabled globally or in the given guild
 */
export const isCommandEnabled = async (command: CommandInterface, guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    const enabledGlobally: boolean = command.properties.Enabled;
    const enabledByDefault: boolean = command.properties.DefaultEnabled;
    const enabledInGuild: boolean = guildData.commands.enabledCommands.includes(command.data.name);
    const disabledInGuild: boolean = guildData.commands.disabledCommands.includes(command.data.name);
    let cannotBeDisabled: boolean = false;
    if ( command.properties.CanBeDisabled === false ) cannotBeDisabled = true;


    if ( !enabledGlobally ) { return false; }

    if ( enabledByDefault && cannotBeDisabled ) return true;
    if ( enabledByDefault && !disabledInGuild ) return true;
    if ( !enabledByDefault && enabledInGuild ) return true;
    if ( !enabledByDefault && !enabledInGuild ) return false;
    if ( disabledInGuild ) return false;

    console.error("CommandUtils.isCommandEnabled() failed to determine whether command is disabled. This should never happen. Please report this bug to the bot owner.");
    return false;
}


export const broadcastCommandFailed = async (interaction: CommandInteraction, reason?: string[]|string, command?: CommandInterface, error?: any): Promise<void> => {
    let commandName: string = "";
    let errorMessage: string = "**Command `";
    if (command) commandName = command.properties.Name;
    else commandName = interaction.commandName;
    errorMessage += commandName + "` failed"

    let fuckyWuckyOccurred: boolean = false;
    if ( error ) fuckyWuckyOccurred = true;
    
    // Send command failed output (if any)
    if (reason) {
        if (Array.isArray(reason)) {
            if (reason.length > 0) {
                // Send a bulleted list of reasons if there are many
                if (reason.length > 1) {
                    errorMessage += " for " + reason.length + " reasons:**";
                    for (const error of reason) {
                        errorMessage += "\n - " + error;
                    }

                    // Add another reason just for funsies
                    if ( reason.length > 2 ) errorMessage += "\n - And a partridge in a pear tree!";
                }
                // If there's only one reason, just send it
                else {
                    errorMessage += ":** " + reason[0];
                }
            } else { fuckyWuckyOccurred = true; }
        } else if (reason.length > 0) {
            errorMessage += ":** " + reason;
        } else {
            fuckyWuckyOccurred = true;
        }
    } else fuckyWuckyOccurred = true;
    
    if (fuckyWuckyOccurred) {
        errorMessage += "\n";
        errorMessage += "Oopsie woopsy! Something made a lil' fucky wucky in the backy-endy >w<\nThis weawwy shouldn't happen... pwease contact inco for a fix :3c";
        if (error) {
            console.error("Command " + commandName + " caused an error!");
            console.error(error);
            let errorOutput: string = "";
            if (typeof error === "string") {
                errorOutput = error.toUpperCase();
            } else if (error instanceof Error) {
                errorOutput = error.message;
            }
            if (errorOutput.length != 0) {
                errorMessage += "\n=== Here is the error message: ===\n";
                errorMessage += errorOutput;
            } else {
                errorMessage += "\nNo error output.... uh oh...";
            }
        } else {
            console.error("Command " + commandName + " failed validation but no error was logged!");
        }
    }


    if (interaction.replied || interaction.deferred) {
        interaction.editReply(errorMessage);
    } else {
        interaction.reply({ content: errorMessage, ephemeral: true });
    }
}

export const commandNotImplemented = async ( interaction: CommandInteraction, commandName: string ): Promise<void> => {
    await interaction.editReply("Yeah, uh, the `" + commandName + "` command isn't implemented yet. Sorry.");
    return;
}