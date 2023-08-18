import axios, { AxiosResponse } from "axios";
import { RequestInterface } from "../interfaces/RequestInterface";
import { tmdbAPI } from "../config/config.json";

export enum tmdbRequestType {
    Search,
    Discover,
    Find,
    Configuration,
    Genre,
    Movie
}

export interface tmdbRequestInfo {
    type: tmdbRequestType,
    // A movie query
    query?: string,
    id?: number
}

export interface tmdbResponseType {
    page: number,
    results: tmdbResultType[],
    total_pages: number,
    total_results: number,
}

export interface tmdbResultType {
    adult: boolean,
    backdrop_path: string,
    genre_ids: number[],
    id: number,
    original_language: string,
    original_title: string,
    overview: string,
    popularity: number,
    poster_path: string,
    release_date: string, // YYYY-MM-DD
    title: string,
    video: boolean,
    vote_average: number,
    vote_count: number,
}

export interface tmdbDetailType {
    adult: boolean,
    backdrop_path: string,
    belongs_to_collection: any,
    budget: number,
    genres: {
        id: number,
        name: string,
    }[],
    homepage: string,
    id: number,
    imdb_id: string,
    original_language: string,
    original_title: string,
    overview: string,
    popularity: number,
    poster_path: string,
    production_companies: {
        id: number,
        logo_path: string,
        name: string,
        origin_country: string,
    }[],
    production_countries: {
        iso_3166_1: string,
        name: string,
    }[],
    release_date: string,
    revenue: number,
    runtime: number,
    spoken_languages: {
        english_name: string,
        iso_639_1: string,
        name: string,
    }[],
    status: string,
    tagline: string,
    title: string,
    video: boolean,
    vote_average: number,
    vote_count: number,
}

interface tmdbConfigurationResponseType {
    images: {
        base_url: string,
        secure_base_url: string,
        backdrop_sizes: string[],
        logo_sizes: string[],
        poster_sizes: string[],
        profile_sizes: string[],
        still_sizes: string[],
    },
    change_keys: string[],
}

export const TMDBAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any, any> | null> => {    
        let type: string;
        let credential: string;
        if (process.env.MOVIEDB_API_KEY) {
            type = "key";
            credential = process.env.MOVIEDB_API_KEY;
        } else if (process.env.MOVIEDB_ACCESS_TOKEN) {
            type = "token";
            credential = "Bearer " + process.env.MOVIEDB_ACCESS_TOKEN;
        } else {
            console.error("No MovieDB API credentials found!");
            return null;
        }
        
    
        let res = await axios.get(requestURL, {
            headers: {
                accept: 'application/json',
                Authorization: `${credential}`
            }
        });
    
        if ( res.status !== 200 ) {
            throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
    
        return res;
    },
    formRequestURL: (info: tmdbRequestInfo): string => {
        let requestURL = tmdbAPI.baseURL + "/" + tmdbAPI.version;
        let error : boolean = false;
        switch ( info.type ) {
            case tmdbRequestType.Search:
                if (!info.query) error = true;
                else requestURL += `/${tmdbAPI.endpoints.search}?query=${info.query.replace(" ", "+")}`;
                break;
            case tmdbRequestType.Discover:
                requestURL += `/${tmdbAPI.endpoints.discover}`;
                break;
            case tmdbRequestType.Find:
                requestURL += `/${tmdbAPI.endpoints.find}`;
                break;
            case tmdbRequestType.Configuration:
                requestURL += `/${tmdbAPI.endpoints.configuration}`;
                break;
            case tmdbRequestType.Genre:
                requestURL += `/${tmdbAPI.endpoints.genre}`;
                break;
            case tmdbRequestType.Movie:
                if (!info.id) error = true;
                else requestURL += `/${tmdbAPI.endpoints.movie}/${info.id}`;
                break;
        }
        if (error) throw new Error("Invalid API request info");
        return requestURL;
    },

    formCdnURL: async (): Promise<string> => {
        // We get the CDN info from the configuration API reponse
        const info: tmdbRequestInfo = {
            type: tmdbRequestType.Configuration
        };
        const requestURL: string = await TMDBAPI.formRequestURL(info);
        let res = await TMDBAPI.makeRequest(requestURL);
        if (!res) throw new Error("Invalid CDN info");
        const config: tmdbConfigurationResponseType = res.data;
        // TODO: do something with the rest of the info
        return config.images.secure_base_url;
    
    }
}

export const getMovie = async (query: string | null): Promise<any> => {
    if (!query || query.length == 0) return null;
    const info = {
        type: tmdbRequestType.Search,
        query: query
    } as tmdbRequestInfo;
    const requestURL: string = TMDBAPI.formRequestURL(info);
    let res = await TMDBAPI.makeRequest(requestURL);
    if (!res) return null;
    return res.data;
}

export const getMovieDetails = async (movieId: number): Promise<any> => {
    if (!movieId || movieId == 0) return null;
    const info = {
        type: tmdbRequestType.Movie,
        id: movieId
    } as tmdbRequestInfo;
    const requestURL: string = TMDBAPI.formRequestURL(info);
    let res = await TMDBAPI.makeRequest(requestURL);
    if (!res) return null;
    return res.data;
}