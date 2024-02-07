import { MediaSource, QueuedPlaylist, SongMetadata } from "../utils/music/player.js";
import getYouTubeID from 'get-youtube-id';
import { RequestInterface } from "../interfaces/RequestInterface.js";
import {toSeconds, parse} from 'iso8601-duration';
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import axios, { AxiosResponse } from "axios";
import { CommandStatus, broadcastCommandStatus, commandStatusInfo } from "../utils/commandUtils.js";
import { ChatInputCommandInteraction } from "discord.js";
import { playSong } from "../commands/slashCommands/music/play.js";
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
    type: "search" | "playlist" | "playlistItems" | "id",
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
        const youtubeConfig = config.music.youtubeAPI;
        let requestURL = youtubeConfig.baseURL + "/v" + youtubeConfig.version;
        let error: boolean = false;
        if (!info.query) error = true;
        switch (info.type) {
            case "search":
                requestURL += `/${youtubeConfig.endpoints.search}`;
                requestURL += `?q=${info.query.replace(" ", "+")}`;
                break;
            case "playlist":
                requestURL += `/${youtubeConfig.endpoints.playlist}`;
                requestURL += `?id=${info.query}`
                break;
            case "playlistItems":
                requestURL += `/${youtubeConfig.endpoints.playlistItems}`;
                requestURL += `?playlistId=${info.query}`
                break;
            case "id":
                requestURL += `/${youtubeConfig.endpoints.id}`;
                requestURL += `?id=${info.query}`;
                break;
            default:
                error = true;
                break;
        }
        requestURL += `&key=${process.env.GOOGLE_API_KEY}`;

        if (!process.env.GOOGLE_API_KEY) error = true;
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


const getYoutubeMetadataFromVideoId = async (videoId: string): Promise<SongMetadata> => {
    const request: youtubeRequestInfo = {
        query: videoId,
        type: "id",
        part: "id,snippet,contentDetails"
    }
    const res = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(request));
    if (!res) throw new Error("Invalid youtube url");
    const video: VideoDetailsResponse = res.data.items[0];
    const metadata: SongMetadata = {
      source: MediaSource.Youtube,
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

export const getYoutubeVideoByQuery = async (query: string): Promise<SongMetadata> => {
    const request: youtubeRequestInfo = {
        query: query,
        type: "search",
        maxResults: 1,
    };
    const res = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(request));
    if (!res) throw new Error("Invalid youtube url");
    const videoId = res.data.items[0].id.videoId;
    return await getYoutubeMetadataFromVideoId(videoId);
}

export const getYoutubeVideoByURL = async (url: string): Promise<SongMetadata> => {
    // Parse id
    const id: string | null = await getYouTubeID(url);
    if (!id) throw new Error("Invalid youtube url");
    return await getYoutubeMetadataFromVideoId(id);
}

export const getYoutubePlaylistById = async (playlistId: string, limit: number): Promise<{songs: SongMetadata[], playlistMetadata: QueuedPlaylist}> => {
  const infoRequest: youtubeRequestInfo = {
    query: playlistId,
    type: "playlist",
    maxResults: 50,
    part: "id,snippet,contentDetails"
  }
  // Get playlist information
  const infoRes = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(infoRequest));
  if (!infoRes) throw new Error("Invalid youtube playlist url");

  const playlistMetadata: QueuedPlaylist = {
    title: infoRes.data.items[0].snippet.title,
    source: "Youtube",
    url: `https://www.youtube.com/playlist?list=${infoRes.data.items[0].id}`
  };

  // Get playlist items
  const playlistRequest: youtubeRequestInfo = {
    query: playlistId,
    type: "playlistItems",
    maxResults: limit,
    part: "contentDetails"
  }
  const playlistRes = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(playlistRequest));
  if (!playlistRes) throw new Error("Invalid youtube playlist url");
  const items = playlistRes.data.items;
  let videoId = "";
  const songs: SongMetadata[] = [];
  for ( const playlistItem of items ) {
      videoId = playlistItem.contentDetails.videoId;
      let song = await getYoutubeMetadataFromVideoId(videoId);
      song.playlist = playlistMetadata;
      songs.push(song);
  }
  return {songs: songs, playlistMetadata: playlistMetadata};
}

export const getYoutubeSuggestionsForQuery = async (query: string): Promise<string[]> => {
  let requestURL: string = config.music.youtubeAPI.suggestionsURL + `"` + query + `"`;
  const res = await youtubeAPI.makeRequest(requestURL);
  return res ? res.data[1] : [];
}


/*
  ====================
  SPOTIFY
   - Convert spotify url to youtube url
*/

export const searchYoutube = async (query: string, shouldSplitChapters: boolean, singleResult: boolean, interaction: ChatInputCommandInteraction): Promise<SongMetadata[] | null> => {
    const request: youtubeRequestInfo = {
        query: query,
        type: "search",
        maxResults: 5,
    };
    const res = await youtubeAPI.makeRequest(youtubeAPI.formRequestURL(request));
    if (!res) {
      await broadcastCommandStatus(interaction, CommandStatus.BadAPIResponse, 
        {command: playSong, reason: "No response from API", apiName: "YouTube"});
      return null;
    }
    const videos = res.data.items;
    const metadata: SongMetadata[] = [];

    if (singleResult) {
      let firstVideo;

      for (const video of videos) {
        if (video.id.kind === 'youtube#video') {
          firstVideo = video;
          break;
        }
        if (!firstVideo) {
          throw new Error('No video found.');
        }
      }
      const videoId = firstVideo.id.videoId;
      const videoMetadata = await getYoutubeMetadataFromVideoId(videoId);
      metadata.push(videoMetadata);
    } else {
      for (const video of videos) {
          const videoId = video.id.videoId;
          const videoMetadata = await getYoutubeMetadataFromVideoId(videoId);
          metadata.push(videoMetadata);
      }
    }
    return metadata;
}

