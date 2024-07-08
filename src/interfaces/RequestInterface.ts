import { AxiosResponse } from "axios";

export interface RequestInterface {
    makeRequest(requestURL: string, query?: string): Promise<AxiosResponse<any, any> | null>;

    formRequestURL(requestInfo: Object): string;

    formCdnURL?(requestInfo?: Object): Promise<string>;

}

export interface OAuthRequestInterface extends RequestInterface {
    accessToken: string;
    tokenType?: string;
    expiry?: Date;

    authenticate(): Promise<boolean>;
}