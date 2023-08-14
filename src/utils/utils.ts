// General-purpose utility functions

import { GatewayIntentBits } from "discord.js";
import { BOT } from "../index";

export const toTitleCase = (text: string): string => {
    return text.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
};

export const intentEnumToString = ( intent: GatewayIntentBits ): string => {
    switch ( intent ) {
        case GatewayIntentBits.Guilds: return "Guilds";
        case GatewayIntentBits.GuildMembers: return "GuildMembers";
        case GatewayIntentBits.GuildModeration: return "GuildModeration";
        case GatewayIntentBits.GuildBans: return "GuildBans";
        case GatewayIntentBits.GuildEmojisAndStickers: return "GuildEmojisAndStickers";
        case GatewayIntentBits.GuildIntegrations: return "GuildIntegrations";
        case GatewayIntentBits.GuildWebhooks: return "GuildWebhooks";
        case GatewayIntentBits.GuildInvites: return "GuildInvites";
        case GatewayIntentBits.GuildVoiceStates: return "GuildVoiceStates";
        case GatewayIntentBits.GuildPresences: return "GuildPresences";
        case GatewayIntentBits.GuildMessages: return "GuildMessages";
        case GatewayIntentBits.GuildMessageReactions: return "GuildMessageReactions";
        case GatewayIntentBits.GuildMessageTyping: return "GuildMessageTyping";
        case GatewayIntentBits.DirectMessages: return "DirectMessages";
        case GatewayIntentBits.DirectMessageReactions: return "DirectMessageReactions";
        case GatewayIntentBits.DirectMessageTyping: return "DirectMessageTyping";
        case GatewayIntentBits.MessageContent: return "MessageContent";
        case GatewayIntentBits.GuildScheduledEvents: return "GuildScheduledEvents";
        case GatewayIntentBits.AutoModerationConfiguration: return "AutoModerationConfiguration";
        case GatewayIntentBits.AutoModerationExecution: return "AutoModerationExecution";
        default: return "Unknown Intent!";
    }
}

/**
 * Returns true if the string matches a valid URL pattern, false otherwise
 * @param str 
 */
export const validURL = (str: string): boolean => {
    const urlPattern = new RegExp("/^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/");
    
    return urlPattern.test(str);
}
/**
 * Returns true if the string matches a valid image URL pattern, false otherwise
 * @param str 
 */
export const validImageURL = (str: string): boolean => {
    const imageURLPattern = new RegExp("(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)");
    return imageURLPattern.test(str);
}

/**
 * Truncates a string to a specified length, adding an ellipsis if the string is longer than the specified length
 * @param str 
 * @param num 
 * @returns 
 */
export const truncateString = (str: string, num: number): string => {
    if (str.length <= num) {
      return str
    }
    return str.slice(0, num) + '...'
}