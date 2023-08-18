import { AxiosResponse } from "axios";

export interface RequestInterface {
    makeRequest(requestURL: string): Promise<AxiosResponse<any, any> | null>;

    formRequestURL(requestInfo: Object): string;

    formCdnURL?(requestInfo?: Object): Promise<string>;

}