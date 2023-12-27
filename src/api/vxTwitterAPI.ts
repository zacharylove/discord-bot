import axios, { AxiosResponse } from "axios";
import { RequestInterface } from "../interfaces/RequestInterface";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };

/**
 * Given a string, checks if it is a valid X/Twitter post URL
 * Should check if string is URL before calling this function.
 * @param url 
 */
export const parseXURL = (url: string): {username: string, id: string} | null => {
    // Two types of URLS: twitter and X
    // http(s)://x.com/[user]/[status]/[id]
    // http(s)://twitter.com/[user]/[status]/[id]
    const regex = new RegExp('^https?://(x|twitter)\\.com/([^/]+)/status/(\\d+)$');
    const match = url.match(regex);

    if (match) {
        if (match.length < 3) return null;
        console.debug(`Match: ${match}`)
        const username = match[2];
        const postId = match[3];
        console.debug(`Parsed X post URL: Username: ${username}, Post ID: ${postId}`);
        return {username: username, id: postId}
    }
    return null;
}


/**
 * Given a string, checks if it is a twitter cdn url and removes it
 * Should check if string is URL before calling this function.
 * @param url 
 */
export const removeTURL = (url: string): string => {
    const regexPattern = new RegExp('https://t\\.co/[^\\s]+', 'g');
    return url.replace(regexPattern, '');

}

export const VXTwitterAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any, any> | null> => {
        // Make request
        let res = await axios.get(requestURL, {});
        if ( res.status !== 200 ) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        return res;
    },
    formRequestURL: (parsed: { username: string; id: string; }): string => {
        let requestURL = "";
        if (parsed)  {
            requestURL = `${config.vxtwitter.API.baseURL}/${parsed.username}/${config.vxtwitter.API.endpoints.status}/${parsed.id}`;
        }
        return requestURL;
    }
}