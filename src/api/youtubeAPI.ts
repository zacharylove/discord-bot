import { SongMetadata } from "../utils/music/player.js";
import getYouTubeID from 'get-youtube-id';
import { RequestInterface } from "../interfaces/RequestInterface.js";
import {toSeconds, parse} from 'iso8601-duration';
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import axios, { AxiosResponse } from "axios";
/*
    Dependencies:
     - get-youtube-id: gets a youtube id from a url
*/


interface VideoDetailsResponse {
  id: string;
  contentDetails: {
    videoId: string;
    duration: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    liveBroadcastContent: string;
    description: string;
    thumbnails: {
      medium: {
        url: string;
      };
    };
  };
}

interface PlaylistResponse {
  id: string;
  contentDetails: {
    itemCount: number;
  };
  snippet: {
    title: string;
  };
}

interface PlaylistItemsResponse {
  items: PlaylistItem[];
  nextPageToken?: string;
}

interface PlaylistItem {
  id: string;
  contentDetails: {
    videoId: string;
  };
}

export interface youtubeRequestInfo {
    query: string,
    type: "search" | "playlist" | "id",
    maxResults?: number,
    // Part is only used for id
    part?: string,
}

export const youtubeAPI: RequestInterface = {
    makeRequest: async (requestURL: string): Promise<AxiosResponse<any, any> | null> => {
        let res = await axios.get(requestURL, {});
        if (res.status !== 200) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res;
    },
    formRequestURL: (info: youtubeRequestInfo): string => {
        let requestURL = config.youtubeAPI.baseURL + "/v" + config.youtubeAPI.version;
        let error: boolean = false;
        if (!info.query) error = true;
        switch (info.type) {
            case "search":
                requestURL += `/${config.youtubeAPI.endpoints.search}`;
                requestURL += `?q=${info.query.replace(" ", "+")}`;
                requestURL += `&key=${process.env.YOUTUBE_API_KEY}`;
                break;
            case "playlist":
                break;
            case "id":
                requestURL += `/${config.youtubeAPI.endpoints.id}`;
                requestURL += `?id=${info.query}`;
                requestURL += `&key=${process.env.YOUTUBE_API_KEY}`;
                break;
            default:
                error = true;
                break;
        }

        if (!process.env.YOUTUBE_API_KEY) error = true;
        if (error) throw new Error("Invalid API request info");
        if (info.part) {
            requestURL += `&part=${info.part.replace(" ", "")}`;
        }
        
        if (info.maxResults) {
            requestURL += `&maxResults=${info.maxResults}`;
        }
        return requestURL;
    }

}


const getMetadataFromVideoId = async (videoId: string): Promise<SongMetadata> => {
    const request: youtubeRequestInfo = {
        query: videoId,
        type: "id",
        part: "id,snippet,contentDetails"
    }
    const res = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(request));
    if (!res) throw new Error("Invalid youtube url");
    const video: VideoDetailsResponse = res.data.items[0];
    const metadata: SongMetadata = {
      source: "Youtube",
      title: video.snippet.title,
      artist: video.snippet.channelTitle,
      length: toSeconds(parse(video.contentDetails.duration)),
      offset: 0,
      url: video.id,
      playlist: null, // TODO: playlist support
      isLive: video.snippet.liveBroadcastContent === 'live',
      thumbnailUrl: video.snippet.thumbnails.medium.url,
    }

    return metadata;
}

export const getVideoByQuery = async (query: string): Promise<SongMetadata> => {
    const request: youtubeRequestInfo = {
        query: query,
        type: "search",
        maxResults: 1,
    };
    const res = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(request));
    if (!res) throw new Error("Invalid youtube url");
    const videoId = res.data.items[0].id.videoId;
    return await getMetadataFromVideoId(videoId);
}



export const getVideoByURL = async (url: string): Promise<SongMetadata> => {
    // Parse id
    const id: string | null = await getYouTubeID(url);
    if (!id) throw new Error("Invalid youtube url");
    return await getMetadataFromVideoId(id);
}

export const parseQuery = async (query: string): Promise<SongMetadata[]> => {
    let newSongs: SongMetadata[] = [];
    try {
        const url = new URL(query);
        const YOUTUBE_HOSTS = [
        'www.youtube.com',
        'youtu.be',
        'youtube.com',
        'music.youtube.com',
        'www.music.youtube.com',
        ];
        if (YOUTUBE_HOSTS.includes(url.host)) {
            if (url.searchParams.get('list')) {
                // YouTube playlist
                // TODO: playlist support
            } else {
                const songs = await getVideoByURL(url.href);
                if (songs) newSongs.push(songs);
                else throw new Error("Invalid youtube url");
            }
        } else if (url.protocol === 'spotify:' || url.host === 'open.spotify.com') {
            // TODO: Spotify support
        } else {
            // TODO: HTTP live stream support

        }
    } catch (e: unknown) {
        console.error(e);
        // Not a URL, must search YouTube
        const songs = await getVideoByQuery(query);
  
        if (songs) {
          newSongs.push(songs);
        } else {
          throw new Error('that doesn\'t exist');
        }
    }
    if (newSongs.length === 0) throw new Error('no songs found');
    // TODO: shuffle support
    return newSongs;
}
