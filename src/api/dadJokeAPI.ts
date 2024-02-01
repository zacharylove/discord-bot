// Using https://icanhazdadjoke.com/api
import axios, { AxiosResponse } from "axios";
import { RequestInterface } from "../interfaces/RequestInterface.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };

export interface dadJokeRequestInfo {
    id?: string,
    query?: string,
    random: boolean
}

export const DadJokeAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any, any> | null> => {    
        let res = await axios.get(requestURL, {
            headers: {
                accept: 'application/json'
            }
        });
        if ( res.status !== 200 ) {
            throw new Error(`Dad Joke API Error ${res.status}: ${res.statusText}`);
        }
        return res;
    }
    ,
    formRequestURL: (info: dadJokeRequestInfo): string => {
        const ichdjConfig = config.roleplay.icanhazdadjokeAPI;
        let requestURL = ichdjConfig.baseURL;
        if (info.random) return requestURL;
        if (info.id) {
            requestURL += `/${ichdjConfig.endpoints.joke}/${info.id}`;
        }
        else if (info.query) {
            requestURL += `/${ichdjConfig.endpoints.search}?term=${info.query}`
        }
        return requestURL;
    }
}

export const searchDadJoke = async (query: string): Promise<string[]> => {
    let jokeList = [];
    const info = {
        query: query,
        random: false
    } as dadJokeRequestInfo;
    const url = DadJokeAPI.formRequestURL(info)
    let res;
    try {
        res = await DadJokeAPI.makeRequest(url);
    } catch (e) {
        console.error(`Dad Joke API Error: ${e}`);
        return [];
    }
    if (res == null || res.data.total_jokes == 0) return [];
    for (const result of res.data.results.slice(0,5)) {
        jokeList.push(result.joke)
    }

    return jokeList;
}

export const fetchRandomDadJoke = async (): Promise<string> => {
    const url = DadJokeAPI.formRequestURL({random: true});
    let res = await DadJokeAPI.makeRequest(url);
    if (res == null || res.data.status != 200) return "";
    return res.data.joke;
}