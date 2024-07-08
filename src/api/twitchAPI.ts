import { OAuthRequestInterface, RequestInterface } from "../interfaces/RequestInterface";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import axios, { AxiosResponse } from "axios";

export enum igdbRequestType {
    Search,
    Game
}

export interface igdbRequestInfo {
    type: igdbRequestType,
    query?: string,
    id?: number
}


export const IGDbAPI: OAuthRequestInterface = {
    accessToken: "",
    tokenType: "",
    expiry: undefined,

    makeRequest: async (requestURL: string, query: string): Promise<AxiosResponse<any, any> | null> => {    
        // First, determine if the current datetime is past the expiry date
        const currentDate = new Date();
        if ((IGDbAPI.expiry && currentDate >= IGDbAPI.expiry) || IGDbAPI.accessToken == '') {
            if (!await IGDbAPI.authenticate()) return null;
        }

        const headers = {
            "Accept": "application/json",
            "Client-ID": process.env.TWITCH_CLIENT_ID ? process.env.TWITCH_CLIENT_ID : "",
            "Authorization": "Bearer " + IGDbAPI.accessToken,
        }
        const data = query ? `fields *; where name = "${query}";` : undefined;

        // Next, make request        
        let res = await axios.post(
            requestURL, 
            {
            headers: headers,
            data: data

        });
        if ( res.status !== 200 ) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res;

    },
    formRequestURL: (info: igdbRequestInfo): string => {
        const igdbConfig = config.game.TwitchAPI;
        let requestURL = igdbConfig.baseURL + "/v" + igdbConfig.version;
        let error : boolean = false;
        switch (info.type) {
            case igdbRequestType.Search:
                if (!info.query) error = true;
                else requestURL += `/${igdbConfig.endpoints.search}?name=${info.query}`;
                break;
            case igdbRequestType.Game:
                if (!info.query) error = true;
                else requestURL += `/${igdbConfig.endpoints.games}`;
                break;
        }
        if (error) throw new Error("Invalid API request info");
        return requestURL;
    },
    authenticate: async (): Promise<boolean> => {
        const igdbConfig = config.game.TwitchAPI;
        if (!igdbConfig || !igdbConfig.authURL) {
            console.error(`Invalid config for IGDb.`);
            return false;
        }
        const authURL = igdbConfig.authURL;

        // Make POST request
        try {
            const response = await axios.post(
                authURL,
                {
                    "client_id": process.env.TWITCH_CLIENT_ID,
                    "client_secret": process.env.TWITCH_CLIENT_SECRET,
                    "grant_type": "client_credentials"
                }
            )
            
            if (response) {
                if (response.status != 200 ) {
                    console.error(`Bad status code when authenticating with Twitch API: ${response.status}`);
                    return false;
                } else if (!response.data.access_token || !response.data.token_type || !response.data.expires_in) {
                    console.error(`Malformed API response when authenticating with Twitch API: ${response.data}`);
                    return false;
                } else {
                    IGDbAPI.accessToken = response.data.access_token;
                    IGDbAPI.tokenType = response.data.token_type;
                    if (response.data.expires_in) {
                        let expiryDate = new Date();
                        expiryDate.setSeconds(expiryDate.getSeconds() + response.data.expires_in);
                        IGDbAPI.expiry = expiryDate;
                    }
                    return true;
                }
            } else {
                console.error(`Something went wrong when authenticating with Twitch API.`);
                return false;
            }
        } catch( e ) {
            console.error(`Error authenticating with Twitch API: ${e}`);
            return false;
        }
    }

}

export const getGameByTitle = async (title: string): Promise<any> => {
    if (title == "") return null;
    let response;
    const info = {
        type: igdbRequestType.Game,
        query: title
    } as igdbRequestInfo;
    // First, we make a search with the query, which should return a set of game IDs
    const requestURL = await IGDbAPI.formRequestURL(info);
    if (requestURL == "") return null;
    try {
        let res = await IGDbAPI.makeRequest(requestURL, title);
        if (!res) return null;
        response = res.data;
    } catch (e) {
        console.error(`IGDb API Error: ${e}`);
        return null;
    }

    return response;


}