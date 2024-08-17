// General-purpose utility functions

import { GatewayIntentBits } from "discord-api-types/v10";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { appendFile } from "fs";
import { Channel, Client, Emoji, Guild, GuildBasedChannel, Interaction, Message, PermissionResolvable, Role, TextChannel } from "discord.js";
import { CommandList } from "../commands/_CommandList.js";
import { CommandInterface } from "../interfaces/Command";
import Bot from "../bot";
import { MessageEmoji } from "../interfaces/MessageContent";


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

export const getDateTimeString = (date: Date): string => {
    return date.getFullYear() + '-' +
        (date.getMonth() + 1).toString().padStart(2, '0') + '-' +
        date.getDate().toString().padStart(2, '0') + ':' +
        date.getHours().toString().padStart(2, '0') + ':' +
        date.getMinutes().toString().padStart(2, '0') + ':' +
        date.getSeconds().toString().padStart(2, '0');
}

export const getCurrentDateTimeString = (): string => {
   return getDateTimeString(new Date());
}

export const logErrorToFile = (err: any, type: string) => {
    console.error(`[!] Found ${type}, writing to log...`);
    let errorMessage = `[${getCurrentDateTimeString()}] Found ${type}:\n${err.stack}\n----------\n`;
    appendFile(`./logs/${config.errorLogFile ? config.errorLogFile : 'error.log'}`, errorMessage, (error) => {
        if (error) console.log(`[!] Error appending error message to file: ${error}`);
        else console.log(`Successfully appended error message to file.`)
    })

}

export const logCommandToFile = (command: CommandInterface, interaction: Interaction, isDm: boolean = false) => {
    console.debug(`[i] ${interaction.user.username} called command ${command.data.name}, writing to log...`);
    let commandMessage = `[${getCurrentDateTimeString()}] Command "${command.data.name}" called by ${interaction.user.username} - ${isDm ? ' DM' : ''}${interaction.inGuild() ? ` Guild ${interaction.guildId}` : '' }${interaction.channelId ? `, channel ${interaction.channelId}` : ''}`;
    appendFile(`./logs/${config.commandLogFile ? config.commandLogFile : 'command.log'}`, commandMessage, (error) => {
        if (error) console.error(`[!] Error appending command message to file: ${error}`);
        else console.debug(`Successfully appended command message to file.`)
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


export function convertLocalDateToUTC(date: Date) {
    const timestamp = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds(),
    );
  
    return new Date(timestamp);
}

export function getCurrentUTCDate() {
    return convertLocalDateToUTC(new Date());
}

export function convertUTCToLocalDate(utcDate: Date) {
    return new Date(
        utcDate.getUTCFullYear(),
        utcDate.getUTCMonth(),
        utcDate.getUTCDate(),
        utcDate.getUTCHours(),
        utcDate.getUTCMinutes(),
        utcDate.getUTCSeconds(),
        utcDate.getUTCMilliseconds(),
    );
}

export const getChannelFromString = async (input: string, guild: Guild): Promise<GuildBasedChannel | null> => {
    const channelRegex = new RegExp(`<#(\\d*)>`);
    let channel;
    let valid: boolean = false;
    const res = channelRegex.exec(input);
    // If channel tag
    if (res != null && res.length > 1) {
        input = res[1].replace("<", "").replace("#", "").replace(">", "");
        channel = await guild.channels.cache.get(input);
        if (channel != undefined) valid = true;
    }
    // Check if it's just a channel name
    if (valid == false) {
        channel = await guild.channels.cache.find(c => c.name.toLowerCase() == input.toLowerCase());
        if (channel != undefined) valid = true;
    }
    // If still invalid, bad channel
    if (valid == false || channel == undefined) {
        return null;
    } else {
        return channel;
    }
}

export const getRoleFromString = async (input: string, guild: Guild, bot: Client): Promise<Role | null> => {
    const hasRole = new RegExp(`<@&(\\d+)>`);
    const res = hasRole.exec(input);
    let role = null;
    if (res != null && res.length > 2) {
        const roleId = res[1];
        role = await guild.roles.cache.find(r => r.id = roleId);
    }
    if (role == null) {
        role = await guild.roles.cache.find(r => r.name == input);
    }
    return role == undefined ? null : role;
}

export const getEmojiFromString = async (input: string, bot: Client): Promise<string | null> => {
    const hasEmoji = new RegExp(`<a?:(.+):(\\d+)>`);
    const res = hasEmoji.exec(input);
    if (res != null && res.length > 2) {
        const emojiString = res[0];
        const emojiId = res[2];
        const emoji = await bot.emojis.cache.find(e => e.id = emojiId);
        if (emoji != undefined) {
            return emojiString
        }
    } 
    return null;
}

/**
 * Given an input string, returns an Emoji object if it contains an emoji, otherwise null
 * @param input 
 * @param bot 
 * @returns 
 */
export const getEmoji = async (input: string, bot: Client): Promise<MessageEmoji | null> => {
    const hasDiscordEmoji = new RegExp(`<a?:(.+):(\\d+)>`);
    const hasUnicodeEmoji = new RegExp(`\\p{Extended_Pictographic}`, 'gu');
    const dRes = hasDiscordEmoji.exec(input);
    const uRes = hasUnicodeEmoji.exec(input);
    // Match discord emoji
    if (dRes != null && dRes.length > 2) {
        const emojiString = dRes[0];
        const emojiId = dRes[2];
        const emoji = await bot.emojis.cache.find(e => e.id = emojiId);
        if (emoji != undefined) {
            return {
                animated: emoji.animated,
                unicode: false,
                name: emoji.name,
                id: emoji.id,
                imageUrl: emoji.imageURL(),
                createdAt: emoji.createdAt,
                createdTimestamp: emoji.createdTimestamp
            } as MessageEmoji;
        }
    } 
    // Match unicode emoji
    else if (uRes != null) {
        return {
            animated: false,
            unicode: true,
            name: uRes[0]
        } as MessageEmoji;
    }
    return null;
}

export const emojiToString = (emoji: MessageEmoji) => {
    const hasUnicodeEmoji = new RegExp(`\\p{Extended_Pictographic}`, 'gu');
    if (emoji.name && hasUnicodeEmoji.exec(emoji.name)) {
        return emoji.name;
    }

    if (emoji.name != undefined && emoji.id != undefined) {
        return `<${emoji.animated ? "a" : ""}:${emoji.name}:${emoji.id}>`;
    }
    return "unknown emoji";
}