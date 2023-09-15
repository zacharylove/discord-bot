import axios, { AxiosResponse } from "axios";
import { RequestInterface } from "../interfaces/RequestInterface";
import { tmdbAPI } from "../config/config.json";

export interface parsedQuery {
    title: string,
    year: string,
    // Alternate titles are used if there is no match
    alternateTitles: string[];
}

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
    id?: number,
    year?: string
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

        if (info.year) requestURL += `&year=${info.year}`;
        if (error) throw new Error("Invalid API request info");
        return requestURL;
    },

    formCdnURL: async (): Promise<string> => {
        // We get the CDN info from the configuration API reponse
        const info: tmdbRequestInfo = {
            type: tmdbRequestType.Configuration
        };
        try {
            const requestURL: string = await TMDBAPI.formRequestURL(info);
            let res = await TMDBAPI.makeRequest(requestURL);
            if (!res || res.data.SUCCESS == false) throw new Error("Invalid CDN info");
            const config: tmdbConfigurationResponseType = res.data;
            // TODO: do something with the rest of the info
            return config.images.secure_base_url;
        } catch (e) {
            console.error(`TMDB API Error: ${e}`);
            return '';
        }
    
    }
}

// Parse a query for relevant data
export const parseQuery = (query: string): parsedQuery => {
    let toReturn: parsedQuery = {
        title: query,
        year: "",
        alternateTitles: []
    };
    query = query.toLowerCase();
    // First, check if there are multiple words
    if (query.includes(" ")) {
        // Date
        // Regex matches (YYYY) and YYYY
        const dateRegex = new RegExp(`\\s?\\(?\\d{4}\\)?\\s?`);
        const matchedYear: RegExpExecArray | null = dateRegex.exec(query);
        if (matchedYear != null && matchedYear.length > 0) {
            // Remove matched year
            toReturn.alternateTitles.push(query.replace(dateRegex, ""));
            toReturn.year = matchedYear[0].replace(" ", "").replace("(", "").replace(")", "")
        }

        // Look for "the" and add variants with/without it
        if (query.startsWith("the ")) {
            toReturn.alternateTitles.push(query.replace("the ", ""));
        } else {
            toReturn.alternateTitles.push(`the ${query}`);
        }
    }
    return toReturn;
}

const getMovieHelper = async (query: string | null, year?: string): Promise<any> => {
    const info = {
        type: tmdbRequestType.Search,
        query: query,
        year: year
    } as tmdbRequestInfo;
    const requestURL: string = TMDBAPI.formRequestURL(info);
    if (requestURL == '') return null;
    try {
        let res = await TMDBAPI.makeRequest(requestURL);
        if (!res || res.data.SUCCESS == false || res.data.results.length == 0) return null;
        return res.data;
    } catch (e) {
        console.error(`TMDB API Error: ${e}`);
        return null;
    }
}

export const getMovie = async (query: string | null): Promise<any> => {
    if (!query || query == undefined) return null;
    const parsedQuery: parsedQuery = parseQuery(query);
    // First try given title
    let response = await getMovieHelper(parsedQuery.title);
    if (response != null) return response;
    // Then try all alternate titles
    else {
        let firstTitle: boolean = true;
        for (const altTitle of parsedQuery.alternateTitles) {
            if (firstTitle) {
                response = await getMovieHelper(altTitle, parsedQuery.year);
                firstTitle = false;
            } else {
                response = await getMovieHelper(altTitle);
            }
            if (response != null) return response;
        }
    }
    return null;
}

export const getMovieDetails = async (movieId: number): Promise<any> => {
    if (!movieId || movieId == 0) return null;
    const info = {
        type: tmdbRequestType.Movie,
        id: movieId
    } as tmdbRequestInfo;
    const requestURL: string = TMDBAPI.formRequestURL(info);
    if (requestURL == '') return null;
    try {
        let res = await TMDBAPI.makeRequest(requestURL);
        if (!res || res.data.SUCCESS == false) return null;
        return res.data;
    } catch (e) {
        console.error(`TMDB API Error: ${e}`);
        return null;
    }
}

export const getMovieProviders = async (movieId: number): Promise<any> => {
    if (!movieId || movieId == 0) return null;
    const info = {
        type: tmdbRequestType.Movie,
        id: movieId
    } as tmdbRequestInfo;
    let requestURL: string = TMDBAPI.formRequestURL(info);
    requestURL += "/watch/providers";
    if (requestURL == '') return null;
    try {
        let res = await TMDBAPI.makeRequest(requestURL);
        if (!res || res.data.SUCCESS == false) return null;
        return res.data;
    } catch (e) {
        console.error(`TMDB API Error: ${e}`);
        return null;
    }
}