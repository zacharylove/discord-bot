import { RequestInterface } from "../interfaces/RequestInterface";
import axios, { AxiosResponse } from "axios";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
const traceConfig = config.anime.trace;

export interface traceRequestInfo {
    imageURL: string,
    includeAnilistInfo?: boolean,
    cropBlackBorders?: boolean
}

export const TraceAPI: RequestInterface = {
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
    formRequestURL: (info: traceRequestInfo): string => {
        let requestURL = traceConfig.baseURL + "/" + traceConfig.endpoints.search;
        requestURL += `?url=${info.imageURL}`;
        if (info.includeAnilistInfo) requestURL += "&anilistInfo";
        if (info.cropBlackBorders) requestURL += "&cutBorders";

        return requestURL;
    }
}

export const getAnimeSource = async (imageURL: string, includeAnilistInfo: boolean = true, cropBlackBorders: boolean = true): Promise<any> => {
    const info = {
        imageURL: imageURL,
        includeAnilistInfo: includeAnilistInfo,
        cropBlackBorders: cropBlackBorders
    } as traceRequestInfo;
    const requestURL: string = TraceAPI.formRequestURL(info);
    if (requestURL == '') return null;
    try {
        let res = await TraceAPI.makeRequest(requestURL);
        if (!res || res.data.result.length == 0) return null
        if (res.data.error != "") return res.data.error;
        return res.data;
    } catch (e: unknown) {
        return `Trace API Error: ${e}`;
    }
}