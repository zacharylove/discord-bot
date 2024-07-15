// General-purpose utility functions

import { GatewayIntentBits } from "discord-api-types/v10";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { appendFile } from "fs";
import { Guild, Message, PermissionResolvable, TextChannel } from "discord.js";
import { CommandList } from "../commands/_CommandList.js";
import { CommandInterface } from "../interfaces/Command";

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

export function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

export const parseManyURLs = (str: string): string[] => {
    console.debug(`Parsing URLs from string ${str}...`);
    const regex = new RegExp('\\bhttps?://\\S+\\b', 'g');

    let match;
    const validURLs = [];
    while ((match = regex.exec(str)) !== null) {
        validURLs.push(match[0]);
    }
    if (validURLs.length > 0) console.debug(`Found ${validURLs.length} valid URLs`);
    return validURLs;
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
 * Returns true if the string matches a valid image URL pattern, false otherwise
 * @param str 
 */
export const validVideoURL = (str: string): boolean => {
    const imageURLPattern = new RegExp("(http(s?):)([/|.|\w|\s|-])*\.(?:mp4|webm)\??.*$");
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

/**
 * Randomizes the order of a given array
 * @param array 
 */
export const shuffleArray = (array: any[]): any[] => {
    let currentIndex = array.length,  randomIndex;
  
    // While there remain elements to shuffle...
    while (currentIndex != 0) {
  
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;
  
      // And swap it with the current element.
      [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
  
    return array;
}


export const secondsToTimestamp = async (seconds: number, markers?: boolean): Promise<string> => {
    function leadingZeroes(num: number, size: number) {
        let strNum = num.toString();
        while (strNum.length < size) strNum = "0" + strNum;
        return strNum;
    }

    let m = 0;
    let h = 0;
    let s = seconds;
    while (s > 60) {
        m++;
        s -= 60;
    }
    while (m > 60) {
        h++;
        m -= 60;
    }
    s = Math.floor(s);
    return `${h > 0 ? `${leadingZeroes(h,2)}${markers ? "h " : ":"}` : ''}${m > 0 ? `${leadingZeroes(m,2)}${markers ? "m " : ":"}` : `00${markers ? "m " : ":"}`}${leadingZeroes(s,2)}${markers ? "s" : ""}`;
}

export const confirmationMessage = (): string => {
    const messages = config.responseMessages.confirmation;
    return messages[Math.floor(Math.random() * messages.length)];
}

export const denialMessage = (): string => {
    const messages = config.responseMessages.confirmation;
    return messages[Math.floor(Math.random() * messages.length)];
}

export const invalidMessage = (): string => {
    const messages = config.responseMessages.invalid;
    return messages[Math.floor(Math.random() * messages.length)];
}

export const getCurrentDateTimeString = (): string => {
    const date = new Date();
    return date.getFullYear() + '-' +
        (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
        date.getDate().toString().padStart(2, '0') + ':' +
        date.getHours().toString().padStart(2, '0') + ':' +
        date.getMinutes().toString().padStart(2, '0') + ':' +
        date.getSeconds().toString().padStart(2, '0');
}

export const logErrorToFile = (err: any, type: string) => {
    console.error(`[!] Found ${type}, writing to log...`);
    let errorMessage = `[${getCurrentDateTimeString()}] Found ${type}:\n${err.stack}\n----------\n`;
    appendFile(`./logs/${config.logFile ? config.logFile : 'error.log'}`, errorMessage, (error) => {
        if (error) console.log(`[!] Error appending error message to file: ${error}`);
        else console.log(`Successfully appended error message to file.`)
    })

}

export const checkBotGuildPermission = async (guild: Guild, checkAdmin: boolean = false, ...permission: PermissionResolvable[] ) => {
    if (guild.members.me == null) {
        console.error(`Error in guild permission check: Guild ${guild.id} does not have bot in member list!`);
        return false;
    }
    if (permission.some(p => !guild.members.me!.permissions.has(p, checkAdmin))) return false;
    return true;
}

export const checkBotChannelPermission = async (guild: Guild, channelId: string, checkAdmin: boolean = false, ...permission: PermissionResolvable[]) => {
    if (guild.members.me == null) {
        console.error(`Error in channel permission check: Guild ${guild.id} does not have bot in member list!`);
        return false;
    }
    if (permission.some(p => !guild.members.me!.permissionsIn(channelId).has(p, checkAdmin))) return false;
    return true;
}

export const getCommandByName = (name: string): CommandInterface | null => {
    for (const Command of CommandList) {
        // If command matches and is not globally disabled
        if (name === Command.data.name || name === Command.properties.Name) return Command;
    }
    return null;
}
