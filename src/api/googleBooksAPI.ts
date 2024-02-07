import { RequestInterface } from "../interfaces/RequestInterface.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import axios, { AxiosResponse } from "axios";

export interface googleBooksRequestInfo {
    query: string,
    author?: string,
    type: "search"
}

export interface BookResponse {
    url: string,
    id: string,
    title: string,
    subtitle: string,
    authors: string[],
    publisher: string,
    publishDate: string,
    description: string,
    categories: string[],
    language: string,
    thumbnailURL: string,
    pageCount: number,
    tagline: string,
}


export const googleBooksAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any, any> | null> => {
        let res = await axios.get(requestURL, {});
        if (res.status !== 200) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res;
    },
    formRequestURL: (info: googleBooksRequestInfo): string => {
        const googleBooksConfig = config.book.googleBooksAPI;
        let requestURL = googleBooksConfig.baseURL + "/v" + googleBooksConfig.version;
        
        let error: boolean = false;
        if (!process.env.GOOGLE_API_KEY) {
            throw new Error("No Google Books API specified!");
        }
        
        
        if (!info.query) error = true;
        switch (info.type) {
            case "search":
                requestURL += `/${googleBooksConfig.endpoints.books}`
                requestURL += `?q="${info.query}"`
                break;
            default:
                error = true;
                break;
        }

        requestURL += `&key=${process.env.GOOGLE_API_KEY}`;
        if (error) throw new Error("Invalid Google Books API request info");
        return requestURL;
    }
}

export const searchBooksByTitle = async (query: string): Promise<BookResponse[]> => {
    const request: googleBooksRequestInfo = {
        query: query,
        type: "search"
    }
    const res = await googleBooksAPI.makeRequest(googleBooksAPI.formRequestURL(request));
    if (!res) throw new Error("Invalid Google Books query!");
    const totalResults = res.data.totalItems;
    if (!totalResults || totalResults == 0) return []
    const items: any[] = res.data.items;
    const results: BookResponse[] = new Array<BookResponse>();
    for (const book of items) {
        results.push({
            url: book.selfLink,
            id: book.id,
            title: book.volumeInfo.title,
            subtitle: book.volumeInfo.subtitle ? book.volumeInfo.subtitle : "",
            authors: book.volumeInfo.authors ? book.volumeInfo.authors : [],
            publisher: book.volumeInfo.publisher ? book.volumeInfo.publisher : "",
            publishDate: book.volumeInfo.publishedDate ? book.volumeInfo.publishedDate : "",
            description: book.volumeInfo.description ? book.volumeInfo.description : "",
            categories: book.volumeInfo.categories ? book.volumeInfo.categories : [],
            language: book.volumeInfo.language ? book.volumeInfo.language : "",
            thumbnailURL: book.volumeInfo.imageLinks && book.volumeInfo.imageLinks.thumbnail ? book.volumeInfo.imageLinks.thumbnail : "",
            pageCount: book.volumeInfo.pageCount ? book.volumeInfo.pageCount : -1,
            tagline: book.searchInfo && book.searchInfo.textSnippet ? book.searchInfo.textSnippet : ""
        } as BookResponse);
    }

    return results;
}



// ========== Hardcover


export const findHardcoverBook = async (title: string): Promise<any> => {

    const url = `${config.book.hardcoverAPI.baseURL}/v${config.book.hardcoverAPI.version}/${config.book.hardcoverAPI.endpoints.graphql}`;
    const headers = {
        "content-type": "application/json",
        "authorization": `Bearer ${process.env.HARDCOVER_API_KEY}`
    };
    const q = `query fetchBook {
        books(where: {title: {_like: "${title}"}}) {
          rating
          ratings_count
          cached_tags
          description
        }
      }
    `;

    const res = await axios({
        url: url,
        method: 'post',
        headers: headers,
        data: {
            "operationName": "fetchBook",
            "query": q,
            "variables": {}
        }
    });

    if (res.status !== 200) throw new Error(`Error ${res.status}: ${res.statusText}`);
    return res;

}