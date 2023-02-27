// Utility functions that make API requests
import axios, { AxiosResponse } from "axios";
import { ImageExtension } from "discord.js";
import { discordAPI } from "../config/config.json"
import { getAllImagesFromURL } from "./imageUtils";

// See https://discord.com/developers/docs/reference#image-formatting-cdn-endpoints
export enum requestType {
    GuildMember,
    GuildUser,
    GuildMemberAvatar,
}

export interface requestInfo {
    guildID?: string;
    emojiID?: string;
    userID?: string;
    applicationID?: string;
    teamID?: string;
    roleID?: string;

    type: requestType;
}


const makeRequest = async (requestURL: string): Promise<AxiosResponse<any, any>> => {
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
}

const formBaseURL = (info: requestInfo) => {
    let requestURL = discordAPI.baseURL + "/v" + discordAPI.version;

    // Form URL based on requested info
    let error : boolean = false;
    switch ( info.type ) {
        // For a member of a guild
        case requestType.GuildMember:
            if (!info.guildID || !info.userID) error = true;
            else requestURL += `/guilds/${info.guildID}/members/${info.userID}`;
            break;
    }
    if (error) throw new Error("Invalid API request info");

    return requestURL;
}

const formCdnURL = (info: requestInfo) => {
    let url = discordAPI.cdnURL;

    let error : boolean = false;
    switch ( info.type ) {        
        // For a member of a guild (for avatars)
        case requestType.GuildMember:
            if (!info.guildID || !info.userID) error = true;
            else url += `/guilds/${info.guildID}/users/${info.userID}`;
            break;
    }
    if (error) throw new Error("Invalid CDN info");

    return url;

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
        type: requestType.GuildMember,
    } as requestInfo;
    
    const URL = formBaseURL(info);
    const res = await makeRequest(URL);

    
    // This new base url will be used to get the avatar
    let cdnURL = formCdnURL(info);
    cdnURL += `/avatars/${res.data.avatar}`;

    return getAllImagesFromURL(res.data.avatar, cdnURL);

}