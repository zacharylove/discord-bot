// Utility function for commands

import { ChatInputCommandInteraction, CommandInteraction } from "discord.js";
import CommandList from "../commands/_CommandList.js";
import { getGuildDataByGuildID } from "../database/guildData.js";
import { CommandInterface } from "../interfaces/Command.js";

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

/* ====================
    Command Responses
===================== */

export enum CommandStatus {
    NotImplemented, // Command has not been implemented yet
    Failed, // Command failed due to an error or unforeseen event
    Success, // Command successful (this one shouldnt even be used but its here just in case)
    InvalidInput, // User input is invalid
    BadAPIResponse, // API did not return the expected value(s)
    NoPermission, // Bot does not have permission to run the command
    DisabledInGuild, // Command is disabled in guild
    DisabledGlobally, // Command is globally disabled
    CriticallyFailed, // Something went VERY wrong!
    NoResults, // No results for a query

}

export interface commandStatusInfo {
    reason?: string[] | string, 
    command?: CommandInterface, 
    error?: any, 
    apiName?: string,
    // If for a search
    query?: string
}

export const broadcastCommandStatus = async (interaction: CommandInteraction | ChatInputCommandInteraction, status: CommandStatus, 
    info: commandStatusInfo): Promise<void> => {
    let commandName: string = info.command ? info.command.properties.Name : interaction.commandName;
    let errorMessage: string = ``;

    // Handle edge cases
    let invalid: boolean = false;

    const reason = info.reason;
    
    switch (status) {
        case CommandStatus.NotImplemented:
            errorMessage += `**Command ${commandName} is not implemented yet!**`
            break;
        case CommandStatus.Failed:
            errorMessage += `**Command ${commandName} failed`;
            try {
                // Reason(s)
                if (reason) {
                    // Multiple reasons
                    if (Array.isArray(reason) && reason.length > 0) {
                        // If multiple, create bulleted list
                        if (reason.length > 1) {
                            errorMessage += " for " + reason.length + " reasons:**";
                            for (const error of reason) {
                                errorMessage += "\n - " + error;
                            }
        
                            // Add another reason just for funsies
                            if ( reason.length > 2 ) errorMessage += "\n - And a partridge in a pear tree!";
                        }
                        // Otherwise, send reason
                        else {
                            errorMessage += ":** " + reason[0];
                        }
                    } 
                    else if (reason.length > 0) errorMessage += ":** " + reason;
                    // If empty reason is provided, assume invalid
                    else invalid = true;
                }
            } catch (e) {
                invalid = true;
                console.error(`Error occurred when responding with command status: ${e}`);
            }
            break;
        case CommandStatus.InvalidInput:
            errorMessage += `**Invalid input for ${commandName}!**`;
            break;
        case CommandStatus.BadAPIResponse:
            errorMessage += `**Unexpected API response${info.apiName ? ` from ${info.apiName} API` : ""}!**\n`;
            if (info.error && info.error.length > 0) {
                errorMessage += "API responded with:";
                errorMessage += `\`\`\`${info.error}\`\`\``;
            }
            break;
        case CommandStatus.NoPermission:
            const permsExist: boolean = info.command!.properties.Permissions!.length > 0;
            if (permsExist) {
                const permissions = info.command?.properties.Permissions;
                errorMessage += `**I'm not allowed to run ${commandName}!** Make sure I have the following permissions:\n- ${permissions?.join("\n- ")}`;
            } else invalid = true;
            break;
        case CommandStatus.DisabledInGuild:
            errorMessage += `**Command ${commandName} is disabled in this server!**\n`;
            errorMessage += `Ask an administrator to enable it using \`/settings command enable ${commandName}\`.`;
            break;
        case CommandStatus.DisabledGlobally:
            errorMessage += `**Command ${commandName} has been globally disabled by the bot owner.**\n`;
            errorMessage += "This can happen when a feature/command is being fixed or improved, or when the feature/command is experimental and not ready for public use.";
            break;
        case CommandStatus.CriticallyFailed:
            errorMessage += `**Critical failure in ${commandName}!**`
            invalid = true;
            break;
        case CommandStatus.NoResults:
            errorMessage += `No results found${info.query? ` for query ${info.query}` : ""}.`;
            break;
    }

    // If invalid, send the fucky wucky message
    if (invalid) {
        errorMessage += "\n";
        errorMessage += "Oopsie woopsy! Something made a lil' fucky wucky in the backy-endy >w<\nThis weawwy shouldn't happen... pwease contact inco for a fix :3c";
        if (info.error) {
            console.error("Command " + commandName + " caused an error!");
            console.error(info.error);
            let errorOutput: string = "";
            if (typeof info.error === "string") {
                errorOutput = info.error.toUpperCase();
            } else if (info.error instanceof Error) {
                errorOutput = info.error.message;
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

    // Send message
    interaction.editReply(errorMessage);
}


export const commandNotImplemented = async ( interaction: CommandInteraction, commandName: string ): Promise<void> => {
    await interaction.editReply("Yeah, uh, the `" + commandName + "` command isn't implemented yet. Sorry.");
    return;
}