import { CommandInterface } from "../interfaces/Command.js";
import { validateEventPermissions } from "../utils/validateProperties.js";
import { wordleStats } from "../commands/slashCommands/wordle/wordleStats.js";
import guildModel, { GuildDataInterface, StarboardPost, createNewGuildData } from "./models/guildModel.js";
import { getCommandList, isCommandDisabled, isCommandEnabled } from "../utils/commandUtils.js";
import { FilterQuery } from "mongoose";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { onMessage } from "../events/onMessage.js";
import { onMessageReactionAdd } from "../events/onMessageReaction.js";

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
 * Enables wordle features for the given guild
 * This includes message scanning for wordle results and all commands related to wordle
 * Returns a status message that is sent to the user
 * @param guildID 
 * @returns status message
 */
export const enableWordleFeatures = async (guildID: string): Promise<string> => {
    const guildData = await getGuildDataByGuildID(guildID);
    // If already enabled
    if ( await areWordleFeaturesEnabled(guildID) ) { return "Wordle features are already enabled."; }
    // If intent is not available
    if (!validateEventPermissions(onMessage.properties)) { return "Wordle features require the Message Content intent to scan messages. Please enable it in your server and try again.";}
    // Enable result scanning
    guildData.messageScanning.wordleResultScanning = true;
    // Enable commands
    for( const command of config.wordle.commands) {
        if( guildData.commands.enabledCommands.includes(command.toLowerCase()) ) { continue; }
        guildData.commands.enabledCommands.push(command.toLowerCase());
    }
    

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
    guildData.commands.enabledCommands.filter( function( el ) {
        return !config.wordle.commands.includes( el.toLowerCase() );
      } );


    await update(guildData);
    return "Wordle features have been disabled.";
}

export const areWordleFeaturesEnabled = async (guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    return guildData.messageScanning.wordleResultScanning && guildData.commands.enabledCommands.includes( wordleStats.data.name );
}

/**
 * Enables starboard features for the given server
 * Currently only enables message scanning for starboard and checks if the starboard channel has been set
 * @param guildID 
 * @returns 
 */
export const enableStarboardFeature = async (guildID: string): Promise<string> => {
    var toReturn = "";

    const guildData = await getGuildDataByGuildID(guildID);
    // If already enabled
    if ( await isStarboardEnabled(guildID) ) { return "Starboard is already enabled, dummy!"; }
    if (!validateEventPermissions(onMessageReactionAdd.properties)) { return "Starboard requires the GuildMessageReactions intent to scan messages. Please enable it in your server and try again.";}
     // Enable reaction scanning
     guildData.messageScanning.starboardScanning = true;

     await update(guildData);

     toReturn += "Starboard feature has been enabled";
     // Check if starboard channel has been set
     if (guildData.channels.starboardChannelId == "") {
        toReturn += ", BUT the Starboard channel has not been set. Please use `/starboard channel` command to set a channel";
     }
     toReturn += "!";
     return toReturn;
}   

/**
 * Disables starboard reaction scanning for the given server
 * @param guildID 
 * @returns 
 */
export const disableStarboardFeature = async (guildID: string): Promise<string> => {
    var toReturn = "";

    const guildData = await getGuildDataByGuildID(guildID);
    // If already disabled
    if ( !guildData.messageScanning.starboardScanning ) { return "Starboard is already disabled."; }
    // Disable result scanning
    guildData.messageScanning.starboardScanning = false;

    await update(guildData);
    toReturn += "Starboard feature has been disabled";
    return toReturn;
}

export const setStarboardChannel = async (guildID: string, channelID: string): Promise<string> => {
    const guildData = await getGuildDataByGuildID(guildID);
    guildData.channels.starboardChannelId = channelID;
    await update(guildData);
    return "Starboard channel has been set to <#" + channelID + ">";
}

export const setStarboardThreshold = async (guildID: string, threshold: number): Promise<string> => {
    const guildData = await getGuildDataByGuildID(guildID);
    guildData.starboard.threshold = threshold;
    await update(guildData);
    return "Starboard threshold has been set to " + threshold;
}

export const setStarboardEmojis = async (guildID: string, starEmoji?: string, successEmoji?: string): Promise<string> => {
    const guildData = await getGuildDataByGuildID(guildID);
    if (starEmoji) guildData.starboard.emoji = starEmoji;
    if (successEmoji) guildData.starboard.successEmoji = successEmoji;
    await update(guildData);
    return "Starboard emojis have been set to " + guildData.starboard.emoji + " and " + guildData.starboard.successEmoji;
}

export const isStarboardEnabled = async (guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    return guildData.messageScanning.starboardScanning;
}

export const setStarboardDefaults = async (guildID: string) => {
    const guildData = await getGuildDataByGuildID(guildID);
    var numDefaulted = 0;
    if (guildData.starboard.threshold == undefined) { guildData.starboard.threshold = 5; numDefaulted++; }
    if (guildData.starboard.emoji == undefined) { guildData.starboard.emoji = "⭐"; numDefaulted++; }
    if (guildData.starboard.successEmoji == undefined) { guildData.starboard.successEmoji = "🌟"; numDefaulted++; }
    if (guildData.starboard.leaderboard == undefined) { guildData.starboard.leaderboard = new Array(); numDefaulted++; }
    if (guildData.starboard.posts == undefined) { guildData.starboard.posts = new Array(); numDefaulted++; }
    if (guildData.channels.starboardChannelId == undefined) { guildData.channels.starboardChannelId = ""; numDefaulted++; }
    if (guildData.starboard.blacklistEnabled == undefined) { guildData.starboard.blacklistEnabled = false; numDefaulted++; }
    if (guildData.starboard.blacklistChannels == undefined) { guildData.starboard.blacklistChannels = new Array(); numDefaulted++; }
    await update(guildData);
    if (numDefaulted > 0) console.debug(`${numDefaulted} starboard defaults have been set`);
}

export const removeStoredStarboardPost = async (guildID: string, post: StarboardPost) => {
    const guildData = await getGuildDataByGuildID(guildID);
    const indexToRemove = guildData.starboard.posts.indexOf(post);
    if (indexToRemove != -1) guildData.starboard.posts.splice(indexToRemove, 1);
    // Remove from leaderboard if it exists
    const leaderboardIndexToRemove = guildData.starboard.leaderboard.findIndex( (element) => element.messageID == post.messageID );
    if (leaderboardIndexToRemove != -1) guildData.starboard.leaderboard.splice(leaderboardIndexToRemove, 1);
}

// Twitter Embed Fix
export const isTwitterEmbedFixEnabled = async (guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    // If not configured, default to true
    if (guildData.messageScanning.twitterEmbedFix == undefined) {
        guildData.messageScanning.twitterEmbedFix = true;
        await update(guildData);
    }
    
    return guildData.messageScanning.twitterEmbedFix;
}

export const toggleTwitterEmbedFix =  async (guildID: string, enableDisable: boolean): Promise<string> => {
    var toReturn = "";

    const guildData = await getGuildDataByGuildID(guildID);
    const isEnabled = await isTwitterEmbedFixEnabled(guildID);
    // If already enabled
    if ( enableDisable && isEnabled || !enableDisable && !isEnabled ) { return `Twitter Embed Fix is already ${enableDisable ? "enabled" : "disabled"}, dummy!`; }
     guildData.messageScanning.twitterEmbedFix = enableDisable;
     await update(guildData);

     toReturn += `Twitter Embed Fix feature has been ${enableDisable ? "enabled! I will now respond to Twitter/X posts with a fixed embed." : "disabled." }`;
     return toReturn;
}

// Tiktok Embed Fix
export const isTikTokEmbedFixEnabled = async (guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    // If not configured, default to true
    if (guildData.messageScanning.tiktokEmbedFix == undefined) {
        guildData.messageScanning.tiktokEmbedFix = true;
        await update(guildData);
    }
    
    return guildData.messageScanning.tiktokEmbedFix;
}

export const toggleTikTokEmbedFix =  async (guildID: string, enableDisable: boolean): Promise<string> => {
    var toReturn = "";

    const guildData = await getGuildDataByGuildID(guildID);
    const isEnabled = await isTikTokEmbedFixEnabled(guildID);
    // If already enabled
    if ( enableDisable && isEnabled || !enableDisable && !isEnabled ) { return `TikTok Embed Fix is already ${enableDisable ? "enabled" : "disabled"}, dummy!`; }
     guildData.messageScanning.tiktokEmbedFix = enableDisable;
     await update(guildData);

     toReturn += `TikTok Embed Fix feature has been ${enableDisable ? "enabled! I will now respond to TikTok posts with a fixed embed." : "disabled." }`;
     return toReturn;
}

// Instagram Embed Fix
export const isInstagramEmbedFixEnabled = async (guildID: string): Promise<boolean> => {
    const guildData = await getGuildDataByGuildID(guildID);
    // If not configured, default to true
    if (guildData.messageScanning.instagramEmbedFix == undefined) {
        guildData.messageScanning.instagramEmbedFix = true;
        await update(guildData);
    }
    
    return guildData.messageScanning.instagramEmbedFix;
}

export const toggleInstagramEmbedFix =  async (guildID: string, enableDisable: boolean): Promise<string> => {
    var toReturn = "";

    const guildData = await getGuildDataByGuildID(guildID);
    const isEnabled = await isInstagramEmbedFixEnabled(guildID);
    // If already enabled
    if ( enableDisable && isEnabled || !enableDisable && !isEnabled ) { return `Instagram Embed Fix is already ${enableDisable ? "enabled" : "disabled"}, dummy!`; }
     guildData.messageScanning.instagramEmbedFix = enableDisable;
     await update(guildData);

     toReturn += `Instagram Embed Fix feature has been ${enableDisable ? "enabled! I will now respond to Instagram posts with a fixed embed." : "disabled." }`;
     return toReturn;
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
    if ( guildData.commands.enabledCommands.includes(command.data.name) ) { return "This command is already enabled in this guild."; }
    guildData.commands.enabledCommands.push(command.data.name);
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
    if ( guildData.commands.disabledCommands.includes(command.data.name) ) { return "This command is already disabled in this guild."; }
    guildData.commands.disabledCommands.push(command.data.name);
    await update(guildData);
    return "Command successfully disabled.";
}

/**
 * Returns a list of all enabled commands for the given guild in string format
 * That's all the commands that are enabled in the guild, plus all the commands that are enabled by default and not disabled in the guild
 * @param guildID 
 * @returns 
 */
export const getEnabledCommandListAsString = async (guildID: string): Promise<string[]> => {
    const enabledCommands: string[] = [];
    for ( const command of getCommandList() ) {
        if ( await isCommandEnabled(command, guildID) ) { enabledCommands.push(command.properties.Name); }
    }

    return enabledCommands;
}


/**
 * Returns a list of all disabled commands for the given guild in string format
 * @param guildID 
 * @returns 
 */
export const getDisabledCommandListAsString = async (guildID: string): Promise<string[]> => {
    const disabledCommands: string[] = [];
    for ( const command of getCommandList() ) {
        if ( await isCommandDisabled(command, guildID) ) { disabledCommands.push(command.properties.Name); }
    }
    return disabledCommands;
}

/**
 * Counts the number of guild documents matching the given filter
 * @param filter 
 * @returns 
 */
export const countGuilds = async ( filter?: FilterQuery<GuildDataInterface>) => {
    return filter ? await guildModel.countDocuments(filter) : await guildModel.countDocuments({});
}

export const getGlobalGuildCounterStats = async () => {
    var numConfessions = 0;
    var numStarboardMessages = 0;
    const guilds = await guildModel.find({});
    for (const guild of guilds) {
        if (guild.counters) {
            if (guild.counters.numConfessions) numConfessions += guild.counters.numConfessions;
            if (guild.counters.numStarboardPosts) numStarboardMessages += guild.counters.numStarboardPosts;
        }
    }
    return {
        numConfessions: numConfessions,
        numStarboardMessages: numStarboardMessages
    }
}


// ====================
// Music Bot Functions
// ====================

