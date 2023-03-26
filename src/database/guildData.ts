import { GatewayIntentBits } from "discord.js";
import { CommandInterface } from "../interfaces/Command";
import { validateIntents } from "../utils/validateProperties";
import { wordleStats } from "../commands/wordleStats";
import guildModel, { GuildDataInterface, createNewGuildData } from "./models/guildModel";

/**
 * Updates an existing GuildData object in the database
 * @param guildData 
 */
export const update = async (guildData: GuildDataInterface) => {
    guildData.updatedAt = new Date();
    await guildData.save();
}

/**
 * Finds and returns a GuildData object from the database
 * Creates new GuildData object if none exists
 * @param guildID 
 * @returns 
 */
export const getGuildDataByGuildID = async (guildID: string): Promise<GuildDataInterface> => {
    return ( await guildModel.findOne({ _id: guildID}) ) || ( await createNewGuildData(guildID) );
}

/**
 * Determines whether a given command is enabled in the given guild
 * @param command 
 * @param guildID 
 */
export const isCommandEnabled = async (command: CommandInterface, guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    return guildData.commands.enabledCommands.includes(command);
}

/**
 * Determines whether a given command is disabled in the given guild
 * @param command 
 * @param guildID 
 */
export const isCommandDisabled = async (command: CommandInterface, guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    return guildData.commands.disabledCommands.includes(command);
}

/**
 * Enables wordle features for the given guild
 * This includes message scanning for wordle results and all commands related to wordle
 * Returns a status message that is sent to the user
 * @param guildID 
 * @returns status message
 */
export const enableWordleFeatures = async (guildID: string): Promise<string> => {
    const guildData = await getGuildDataByGuildID(guildID);
    // If already enabled
    if ( guildData.messageScanning.wordleResultScanning ) { return "Wordle features are already enabled."; }
    // If intent is not available
    if (validateIntents([GatewayIntentBits.MessageContent], "EnableWordleFeatures", "Command")) { return "Wordle features require the Message Content intent to scan messages. Please enable it in your server and try again.";}
    // Enable result scanning
    guildData.messageScanning.wordleResultScanning = true;
    // Enable commands
    guildData.commands.enabledCommands.push(wordleStats);

    await update(guildData);
    return "Wordle features have been enabled.";
}

/**
 * Disable wordle features for the given guild
 * This includes message scanning for wordle results and all commands related to wordle
 * Returns a status message that is sent to the user
 * @param guildID 
 * @returns status message
 */
export const disableWordleFeatures = async (guildID: string): Promise<string> => {
    const guildData = await getGuildDataByGuildID(guildID);
    // If already disabled
    if ( !guildData.messageScanning.wordleResultScanning ) { return "Wordle features are already disabled."; }
    // Disable result scanning
    guildData.messageScanning.wordleResultScanning = false;
    // Disable commands
    guildData.commands.enabledCommands = guildData.commands.enabledCommands.filter(command => command !== wordleStats);

    await update(guildData);
    return "Wordle features have been disabled.";
}

/**
 * Attempts to add a command to the list of enabled commands for the given guild
 * Returns a status message that is sent to the user
 * @param command 
 * @param guildID 
 * @returns status message
 */
export const addEnabledCommand = async (command: CommandInterface, guildID: string): Promise<string> => {
    // If command is enabled by default, do nothing
    if ( command.properties.DefaultEnabled ) { return "This command is already enabled by default."; }
    // If command is globally disabled, do nothing
    if ( !command.properties.Enabled ) { return "This command is globally disabled. Please contact the bot owner to enable it."; }
    const guildData = await getGuildDataByGuildID(guildID);
    // If command is already enabled, do nothing
    if ( guildData.commands.enabledCommands.includes(command) ) { return "This command is already enabled in this guild."; }
    guildData.commands.enabledCommands.push(command);
    await update(guildData);
    return "Command successfully enabled.";
}

/**
 * Attempts to add a command to the list of disabled commands for the given guild
 * Returns a status message that is sent to the user
 * @param command 
 * @param guildID 
 */
export const addDisabledCommand = async (command: CommandInterface, guildID: string): Promise<string> => {
    // If command is disabled by default
    if ( !command.properties.DefaultEnabled ) { return "This command is already disabled by default."; }
    // If command is globally disabled, do nothing
    if ( !command.properties.Enabled ) { return "This command is globally disabled, so disabling it for your guild is redundant."; }
    const guildData = await getGuildDataByGuildID(guildID);
    // If command is already disabled, do nothing
    if ( guildData.commands.disabledCommands.includes(command) ) { return "This command is already disabled in this guild."; }
    guildData.commands.disabledCommands.push(command);
    await update(guildData);
    return "Command successfully disabled.";
}

/**
 * Returns a list of all enabled commands for the given guild in string format
 * @param guildID 
 * @returns 
 */
export const getEnabledCommandListAsString = async (guildID: string): Promise<string[]> => {
    const guildData = await getGuildDataByGuildID(guildID);
    return guildData.commands.enabledCommands.map(command => command.properties.Name);
}

/**
 * Converts a list of commands to a list of command names
 * @param commandList 
 * @returns 
 */
export const convertCommandListToString = (commandList: CommandInterface[]): string[] => {
    return commandList.map(command => command.properties.Name);
}

/**
 * Returns a list of all disabled commands for the given guild in string format
 * @param guildID 
 * @returns 
 */
export const getDisabledCommandListAsString = async (guildID: string): Promise<string[]> => {
    const guildData = await getGuildDataByGuildID(guildID);
    return guildData.commands.disabledCommands.map(command => command.properties.Name);
}
