import { RequestInterface } from '../interfaces/RequestInterface';
import Spotify from 'spotify-web-api-node';
import { parse, Album, Artist, Playlist, Track} from 'spotify-uri';
import { BOT } from '../index.js';
import SpotifyWebApi from 'spotify-web-api-node';
import { QueuedPlaylist, SongMetadata } from '../utils/music/player.js';
import { shuffleArray } from '../utils/utils.js';
import { searchYoutube } from './youtubeAPI.js';
import { ChatInputCommandInteraction } from 'discord.js';

/*
Dependencies:
 - spotify-uri
 - spotify-web-api-node

*/



export interface SpotifyTrack {
    name: string;
    artist: string;
}

// Randomly select n number of tracks to match playlist limit
const limitTracks = (tracks: SpotifyApi.TrackObjectSimplified[], limit: number): SpotifyApi.TrackObjectSimplified[] => {
    if(limit === -1) return tracks;
    return tracks.length > limit ? shuffleArray(tracks).slice(0, limit) : tracks;
}
const toSpotifyTrack = (track: SpotifyApi.TrackObjectSimplified): SpotifyTrack => {
    return {
        name: track.name,
        artist: track.artists[0].name
    }
}

const getSpotifyAlbum = async (url: string, spotifyAPI: SpotifyWebApi, playlistLimit?: number): Promise<[SpotifyTrack[], QueuedPlaylist]> => {
    const uri = parse(url) as Album;
    const[{body: album}, {body: {items}}] = await Promise.all([spotifyAPI.getAlbum(uri.id), spotifyAPI.getAlbumTracks(uri.id, {limit: 50})]);
    const tracks = limitTracks(items, playlistLimit ? playlistLimit : -1).map(toSpotifyTrack);
    const playlist = {
        title: album.name,
        source: album.href
    }
    return [tracks,playlist];
}

const getSpotifyPlaylist = async (url: string, spotifyAPI: SpotifyWebApi, playlistLimit?: number): Promise<[SpotifyTrack[], QueuedPlaylist]> => {
    const uri = parse(url) as Playlist;
    let [{body: playlistResponse}, {body: tracksResponse}] = await Promise.all([spotifyAPI.getPlaylist(uri.id), spotifyAPI.getPlaylistTracks(uri.id, {limit: 50})]);
    const items = tracksResponse.items.map(playlistItem => playlistItem.track);
    const playlist = {title: playlistResponse.name, source: playlistResponse.href};

    while (tracksResponse.next) {
        // eslint-disable-next-line no-await-in-loop
        ({body: tracksResponse} = await spotifyAPI.getPlaylistTracks(uri.id, {
            limit: parseInt(new URL(tracksResponse.next).searchParams.get('limit') ?? '50', 10),
            offset: parseInt(new URL(tracksResponse.next).searchParams.get('offset') ?? '0', 10)
        }));
        items.push(...tracksResponse.items.map(playlistItem => playlistItem.track));
    }
    const tracks = limitTracks(items.filter(i => i !== null) as SpotifyApi.TrackObjectSimplified[], playlistLimit ? playlistLimit : -1).map(toSpotifyTrack);
    return [tracks, playlist];
}

const getSpotifyTrack = async (url: string, spotifyAPI: SpotifyWebApi): Promise<SpotifyTrack> => {
    const uri = parse(url) as Track;
    const {body} = await spotifyAPI.getTrack(uri.id);
    return toSpotifyTrack(body);
}

const getSpotifyArtist = async (url: string, spotifyAPI: SpotifyWebApi, playlistLimit?: number): Promise<SpotifyTrack[]> => {
    const uri = parse(url) as Artist;
    const {body} = await spotifyAPI.getArtistTopTracks(uri.id, 'US');
    return limitTracks(body.tracks, playlistLimit ? playlistLimit : -1).map(toSpotifyTrack);
}

export const parseSpotifyURL = async (url: string, interaction: ChatInputCommandInteraction, playlistLimit?: number): Promise<[SongMetadata[], number, number]> => {
    const parsed = parse(url);
    const spotifyAPI: SpotifyWebApi = BOT.getSpotifyAPI();

    let tracks: SpotifyTrack[];
    let playlist: QueuedPlaylist | undefined;

    switch (parsed.type) {
        case 'album':
            [tracks, playlist] = await getSpotifyAlbum(url, spotifyAPI, playlistLimit);
            return spotifyToYoutube(tracks, interaction, playlist);

        case 'playlist':
            [tracks, playlist] = await getSpotifyPlaylist(url, spotifyAPI, playlistLimit);
            return spotifyToYoutube(tracks, interaction, playlist);

        case 'track':
            let track = await getSpotifyTrack(url, spotifyAPI);
            return spotifyToYoutube([track], interaction);
            

        case 'artist':
            tracks = await getSpotifyArtist(url, spotifyAPI, playlistLimit);
            return spotifyToYoutube(tracks, interaction);

        default: {
            return [[],0,0];
        }
    }
}

const spotifyToYoutube = async (tracks: SpotifyTrack[], interaction: ChatInputCommandInteraction, playlist? :QueuedPlaylist | undefined): Promise<[SongMetadata[], number, number]> => {
    const promisedResults = tracks.map(async track => searchYoutube(`"${track.name}" "${track.artist}"`, false, tracks.length === 1, interaction));
    const searchResults = await Promise.allSettled(promisedResults);
    if (searchResults == null || promisedResults == null) return [[],-1,-1];

    let numSongsNotFound = 0;
    let songs: SongMetadata[] = searchResults.reduce((accum: SongMetadata[], result) => {
        if (result.status === 'fulfilled') {
          for (const v of result.value!) {
            accum.push({
              ...v,
              ...(playlist ? {playlist} : {}),
            });
          }
        } else {
            numSongsNotFound++;
        }
  
        return accum;
      }, []);
      return [songs, numSongsNotFound, tracks.length];
}


const filterDuplicates = <T extends {name: string}>(items: T[]) => {
    const results: T[] = [];
  
    for (const item of items) {
      if (!results.some(result => result.name === item.name)) {
        results.push(item);
      }
    }
  
    return results;
  };

export const getSpotifySuggestionsForQuery = async (query: string): Promise<[SpotifyApi.TrackObjectFull[], SpotifyApi.AlbumObjectSimplified[]]> => {
    const spotifyAPI: SpotifyWebApi = BOT.getSpotifyAPI();
    const res = await spotifyAPI.search(query, ['track', 'album'], {limit: 5});
    if (res == undefined) return [[],[]];
    const spotifyAlbums = filterDuplicates(res.body.albums?.items ?? []);
    const spotifyTracks = filterDuplicates(res.body.tracks?.items ?? []);
    return [spotifyTracks, spotifyAlbums]
}