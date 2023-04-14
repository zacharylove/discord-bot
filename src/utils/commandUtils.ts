// Utility function for commands

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
    const enabledInGuild: boolean = guildData.commands.enabledCommands.includes(command);
    const disabledInGuild: boolean = guildData.commands.disabledCommands.includes(command);
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
    const enabledInGuild: boolean = guildData.commands.enabledCommands.includes(command);
    const disabledInGuild: boolean = guildData.commands.disabledCommands.includes(command);
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
