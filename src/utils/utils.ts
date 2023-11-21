// General-purpose utility functions

import { GatewayIntentBits } from "discord.js";

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
    return `${h > 0 ? `${leadingZeroes(h,2)}${markers ? "h " : ":"}` : ''}${m > 0 ? `${leadingZeroes(m,2)}${markers ? "m " : ":"}` : '00'}${leadingZeroes(s,2)}${markers ? "s" : ""}`;
}