import { ChatInputCommandInteraction } from "discord.js";
import play, { SoundCloudTrack } from 'play-dl';
import { MediaSource, SongMetadata } from "../utils/music/player.js";

export const parseSoundCloudURL = async (url: string, interaction: ChatInputCommandInteraction ) => {
    
    await play.getFreeClientID().then((clientId) => {
        play.setToken({
            soundcloud: {
                client_id: clientId
            }
        });
    });
    
    let song = await play.so_validate(url);

    let metadata = {} as SongMetadata;

    switch (song) {
        case "track":
            const songInfo = await play.soundcloud(url);
            metadata = {
                title: songInfo.name,
                artist: songInfo.user.name,
                url: url,
                length: songInfo.durationInSec,
                offset: 0,
                playlist: null,
                isLive: false,
                thumbnailUrl: null,
                source: MediaSource.SoundCloud
            };
            break;
        case "playlist":
            break;
        case "search":
            break;

        case false:
            console.debug("Invalid soundcloud link!!");
            break;
    }

    return metadata;
}

export const getSoundCloudSuggestionsForQuery = async (query: string): Promise<SoundCloudTrack[]> => {
    await play.getFreeClientID().then((clientId) => {
        play.setToken({
            soundcloud: {
                client_id: clientId
            }
        });
    });
    let response = await play.search(query, { limit: 5, fuzzy: true, source : { soundcloud : "tracks" } });

    // Filter out tracks with undefined url
    response = response.filter( track => track.permalink != undefined );


    return response;
}