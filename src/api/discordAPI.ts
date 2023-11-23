// Utility functions that make API requests
import axios, { AxiosResponse } from "axios";
import { ImageExtension } from "discord.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { getAllImagesFromURL } from "../utils/imageUtils.js";
import { RequestInterface } from "../interfaces/RequestInterface.js";

// See https://discord.com/developers/docs/reference#image-formatting-cdn-endpoints
export enum discordRequestType {
    GuildMember,
    GuildUser,
    GuildMemberAvatar,
}

export interface discordRequestInfo {
    guildID?: string;
    emojiID?: string;
    userID?: string;
    applicationID?: string;
    teamID?: string;
    roleID?: string;

    type: discordRequestType;
}

export const DiscordAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any, any> | null> => {
        // Make request
        let res = await axios.get(requestURL, {
            headers: {
                Authorization: `Bot ${process.env.BOT_TOKEN}`
            }
        });
        if ( res.status !== 200 ) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res;
    },
    
    formRequestURL: (info: discordRequestInfo): string => {
        let requestURL = config.discord.API.baseURL + "/v" + config.discord.API.version;
    
        // Form URL based on requested info
        let error : boolean = false;
        switch ( info.type ) {
            // For a member of a guild
            case discordRequestType.GuildMember:
                if (!info.guildID || !info.userID) error = true;
                else requestURL += `/guilds/${info.guildID}/members/${info.userID}`;
                break;
        }
        if (error) throw new Error("Invalid API request info");
    
        return requestURL;
    },

    formCdnURL: async (info: discordRequestInfo): Promise<string> => {
        let url = config.discord.API.cdnURL;
    
        let error : boolean = false;
        switch ( info.type ) {        
            // For a member of a guild (for avatars)
            case discordRequestType.GuildMember:
                if (!info.guildID || !info.userID) error = true;
                else url += `/guilds/${info.guildID}/users/${info.userID}`;
                break;
        }
        if (error) throw new Error("Invalid CDN info");
    
        return url;
    
    }
}





export const hasServerAvatar = async (targetId: string, guildId: string): Promise<boolean> => {
    const info = {
        guildID: guildId,
        userID: targetId,
        type: discordRequestType.GuildMember,
    } as discordRequestInfo;
    
    const URL = DiscordAPI.formRequestURL(info);
    const res = await DiscordAPI.makeRequest(URL);
    if (!res || !res.data.avatar) return false;
    return true;
}

/**
 * Gets the URL of a user's server profile avatar
 * @param info 
 * @returns Map containing image url in all available formats
 */
export const getServerAvatarURLs = async (guildId: string, targetId: string): Promise<Map<ImageExtension, string>> => {
    const info = {
        guildID: guildId,
        userID: targetId,
        type: discordRequestType.GuildMember,
    } as discordRequestInfo;
    
    const URL = DiscordAPI.formRequestURL(info);
    const res = await DiscordAPI.makeRequest(URL);

    if (!res || !res.data.avatar) return new Map<ImageExtension, string>();

    
    // This new base url will be used to get the avatar
    if( !DiscordAPI.formCdnURL ) throw new Error("Failed to form CDN URL");
    let cdnURL = await DiscordAPI.formCdnURL(info);
    cdnURL += `/avatars/${res.data.avatar}`;

    return getAllImagesFromURL(res.data.avatar, cdnURL);

}