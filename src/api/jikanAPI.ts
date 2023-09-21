// Jikan is an unofficial API for MyAnimeList: https://docs.api.jikan.moe/
// No API key or token is needed for read-only access
import axios, { AxiosResponse } from "axios";
import { RequestInterface } from "interfaces/RequestInterface";
import { jikanAPI } from "config/config.json";

export enum animeType {
    tv,
    movie,
    ova,
    special,
    ona,
    music
}

export enum animeStatus {
    airing,
    complete,
    upcoming
}

export enum animeRating {
    g,
    pg,
    pg13,
    r17,
    r,
    rx
}

export enum animeOrderings {
    mal_id,
    title,
    start_date,
    end_date,
    episodes,
    score,
    scored_by,
    rank,
    popularity,
    members,
    favorites
}

export interface jikanRequestInfo {
    sfw?: boolean,
    // Include user-submitted results
    unapproved?: boolean,
    page?: number,
    limit?: number,
    query: string,
    type?: animeType,
    score?: number,
    min_score?: number,
    max_score?: number,
    status?: animeStatus,
    rating?: animeRating,
    order_by?: animeOrderings,
    sort?: "desc" | "asc",
    start_date?: Date,
    end_date?: Date
}

export const JikanAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any,any> | null> => {

        let res = await axios.get(requestURL, {
            headers: {
                accept: 'application/json'
            }
        });
        if ( res.status !== 200 ) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
    
        return res;
    },
    formRequestURL: (info: jikanRequestInfo): string => {
        let requestURL = jikanAPI.baseURL + "/v" + jikanAPI.version + "/";
        let error : boolean = false;
        // Assuming anime search
        requestURL += jikanAPI.endpoints.anime;

        // TODO: handle all parameters if implemented
        requestURL += "?q=" + info.query.replace(new RegExp(`\\s`,'g'), "+");

        if (info.sfw) requestURL += `?sfw=${info.sfw}`;
        if (info.type) requestURL += `?type=${info.type}`;

        if (error) throw new Error("Invalid API request info");
        return requestURL;
    }
}

export const getAnime = async (queryString: string | null): Promise<any> => {
    if (!queryString || queryString == undefined) return null;
    const info = {
        query: queryString
    } as jikanRequestInfo;
    const requestURL: string = JikanAPI.formRequestURL(info);
    if (requestURL == '') return null;
    try {
        let res = await JikanAPI.makeRequest(requestURL);
        if (!res || !res.data.pagination || res.data.pagination.items.total == 0) return null;
        return res.data;
    } catch (e) {
        console.error(`Jikan API Error: ${e}`);
        return null;
    }

}