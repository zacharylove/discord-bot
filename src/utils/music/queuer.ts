import { ChatInputCommandInteraction, GuildMember, Message } from "discord.js";
import Player, { MusicStatus, QueuedSong, SongMetadata, MediaSource, QueuedPlaylist } from "./player.js";
import { getMemberVoiceChannel, getMostPopularVoiceChannel } from "../../utils/voiceChannelUtils.js";
import { getYoutubePlaylistById, getYoutubeVideoByQuery, getYoutubeVideoByURL } from "../../api/youtubeAPI.js";
import { EmbedBuilder } from "@discordjs/builders";
import { parseSpotifyURL } from "../../api/spotifyAPI.js";
import ffmpeg from 'fluent-ffmpeg';
import { confirmationMessage, secondsToTimestamp } from "../../utils/utils.js";
import { CommandStatus, broadcastCommandStatus } from "../commandUtils.js";
import { playSong } from "../../commands/slashCommands/music/play.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };
import ytdl from "ytdl-core";
import { parseSoundCloudURL } from "../../api/soundCloudAPI.js";
// Queuer parses input queries and calls the corresponding player object
export class Queuer {

    constructor(private readonly guildQueueManager: guildQueueManager) {}

    // Max limit for number of songs in a playlist to parse
    private playlistLimit: number = config.music.youtubeAPI.playlistLimit;


    private parseQuery = async (query: string, interaction: ChatInputCommandInteraction): Promise<[SongMetadata[], string]> => {
        let newSongs: SongMetadata[] = [];
        let extraMsg = '';
        let isQuery: boolean = false;
        testUrl: try {
            let url;
            try { 
                url = new URL(query);
            } catch {
                isQuery = true;
                break testUrl;
            }

            // === YouTube ===
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
                    const response = await getYoutubePlaylistById(url.searchParams.get('list')!, this.playlistLimit);
                    if (response.songs) {
                        if (response.songs.length > this.playlistLimit) extraMsg += `a sample of ${this.playlistLimit} songs was taken`;
                        newSongs.push(...response.songs);
                    }
                    else throw new Error("Invalid youtube playlist url");
                } else {
                    const songs = await getYoutubeVideoByURL(url.href);
                    if (songs) newSongs.push(songs);
                    else throw new Error("Invalid youtube url");
                }
            } 
            
            // === Spotify ===
            else if (url.protocol === 'spotify:' || url.host === 'open.spotify.com') {
                const [convertedSongs, nSongsNotFound, totalSongs] = await parseSpotifyURL(query, interaction, this.playlistLimit);
                if (totalSongs > this.playlistLimit) {
                    extraMsg = `a random sample of ${this.playlistLimit} songs was taken`;
                }
                if (totalSongs > this.playlistLimit && nSongsNotFound !== 0) {
                    extraMsg += ' and ';
                }
        
                if (nSongsNotFound !== 0) {
                    if (nSongsNotFound === 1) {
                        extraMsg += '1 song was not found';
                    } else {
                        extraMsg += `${nSongsNotFound.toString()} songs were not found`;
                    }
                }
                newSongs.push(...convertedSongs);
            } 

            // === SoundCloud ===
            // Soundcloud has no API, but we can use the play-dl package to fetch songs using a client id.
            else if ( url.host === 'soundcloud.com' || url.host === 'www.soundcloud.com' ) {
                const songs = await parseSoundCloudURL(query, interaction);
                newSongs.push(songs);
            }
            
            // === Http livestream (fallback) ===
            else {
                const song = await this.getHttpLivestream(query);
                if (song) newSongs.push(song);
                else throw new Error("Invalid http livestream url");
            }
        } catch (e: unknown) {
            console.debug(e);
            // Not a URL, must search YouTube
            isQuery = true;
        }
        if (isQuery) {
            const songs = await getYoutubeVideoByQuery(query);
      
            if (songs) {
              newSongs.push(songs);
            } else {
              throw new Error('that doesn\'t exist');
            }
        }
        if (newSongs.length === 0) {
            await broadcastCommandStatus(interaction, CommandStatus.NoResults, {command: playSong, query: query, reason: "No songs found."});
            return [[], ""];
        }
        // TODO: shuffle support
        return [newSongs, extraMsg];
    }

    public async addToQueue({
        query,
        interaction
    }: {
        query: string,
        interaction: ChatInputCommandInteraction
    }, shuffle: boolean, next: boolean): Promise<void> {
        const guildId: string = interaction.guild!.id;
        const player = this.guildQueueManager.get(guildId);
        const songAlreadyPlaying: boolean = player.getCurrent() !== null;
        const [targetVoiceChannel] = getMemberVoiceChannel(interaction.member as GuildMember) ?? getMostPopularVoiceChannel(interaction.guild!);

        //const settings = await getGuildSettings(guildId);
        //const {playlistLimit} = settings;
        
        let extraMsg: string = '';
        let results: [SongMetadata[], string] = await this.parseQuery(query, interaction);
        const songs = results[0];
        extraMsg = results[1];
        if (songs.length == 0) return;
        let isPlaylist: boolean = songs[0].playlist != null;
        const playlistInfo = songs[0].playlist;
        const numSongsBeforePlay = player.getQueue().length - player.getQueuePosition();
        songs.forEach(song => {
            player.add({
                ...song,
                addedInChannelId: interaction.channel!.id,
                requestedBy: interaction.member!.user.id,
            }, next);
        });
        if (shuffle) player.shuffle();
        const firstSong = songs[0];
        
        let statusMessage: string = '';
        

        // Connect to voice channel
        if (player.voiceConnection === null) {
            await player.connect(targetVoiceChannel);
            // Play!
            await player.play();
            if (songAlreadyPlaying) {
                statusMessage = 'resuming playback';
            }
            await interaction.editReply({
                content: 'Getting your song....',
            });
        } else if (player.status === MusicStatus.IDLE) {
            // Player is idle, start playback instead
            await player.play();
        }

        // Build response message
        if (statusMessage !== '') {
            if (extraMsg === '') {
              extraMsg = statusMessage;
            } else {
              extraMsg = `${statusMessage}, ${statusMessage}`;
            }
        }
    
        if (extraMsg !== '') extraMsg = ` (${extraMsg})`;
        let replyMessage = "";
        const multipleSongs: boolean = songs.length > 1;
        if (!multipleSongs) {
            replyMessage = `${confirmationMessage()} **${firstSong.title}** `;
        } else {
            if (isPlaylist && playlistInfo) {
                replyMessage = `${confirmationMessage()} ${songs.length - 1} songs from the playlist [${playlistInfo.title}](${playlistInfo.url})`;
            } else {
                replyMessage = `${confirmationMessage()} **${firstSong.title}** and ${songs.length - 1} other songs`;
            }
        }

        if (next) replyMessage += ` ${multipleSongs ? 'have been' : 'was'} added to the front of the queue`;
        else replyMessage += ` ${multipleSongs ? 'have been' : 'was'} added to the queue`;

        if (numSongsBeforePlay > 1) {
            if (shuffle) replyMessage += `, the ${numSongsBeforePlay} other songs in the queue have been shuffled,`;
            if (next) replyMessage += ` and will play before ${numSongsBeforePlay} song${numSongsBeforePlay > 1 ? 's': ''}`;
            else replyMessage += ` and will play after ${numSongsBeforePlay} song${numSongsBeforePlay > 1 ? 's': ''}`;
        } else {
            replyMessage += ` and ${multipleSongs ? 'are' : 'is'} now playing`;
        } 
        replyMessage += extraMsg
        await interaction.editReply(replyMessage);
    }


    public createQueueEmbed = async (guildId: string, page: number): Promise<EmbedBuilder> => {
       
        const player = this.guildQueueManager.get(guildId);
        const queue = player.getQueue();
        const progressInCurrentSong = await secondsToTimestamp(await player.getPosition(), false);

        const embed = new EmbedBuilder()
            .setTimestamp()
        ;

        let title = '';
        switch (player.status) {
            case MusicStatus.PLAYING:
                title += '▶️';
                break;
            case MusicStatus.PAUSED:
                title += '⏸️';
                break;
            case MusicStatus.IDLE:
                title += '⏹️';
                break;
        }
        title += `  Queue${player.currentVoiceChannel ? ` for ${player.currentVoiceChannel.name}` : ''}`;


        // Split songs into multiple pages if there are more than 10
        let splitQueue: QueuedSong[][] = [];
        for (let i = 0; i < queue.length; i += 10) {
            splitQueue.push(queue.slice(i, i + 10));
        }
        

        let currentPage = page - 1;

        let description = splitQueue.length > 1 ? `Page ${currentPage + 1}/${splitQueue.length}\n` : '';
        let counter = 0;
        let totalDuration = 0;
        let queuePosition = player.getQueuePosition();
        
        for ( const song of splitQueue.at(currentPage) ?? []) {
            description += `${counter}.`;
            if (counter == queuePosition) description += " ▷ "
            description += ` **[${song.title}](https://www.youtube.com/watch?v=${song.url})**`;
            description += `${song.requestedBy ? ` (<@${song.requestedBy}>` : ''})`;
            if (counter === 0) {
                description += ` - \`[${progressInCurrentSong}/${await secondsToTimestamp(song.length)}]\``;
            } else {
                description += ' - `[' + await secondsToTimestamp(song.length) + ']`';
            }
            description += '\n';
            // Do not count previous songs in duration
            if (counter >= queuePosition) totalDuration += song.length;
            counter++;
        }
        if (queue.length > 0 ) description += `${player.getStatus() == MusicStatus.PLAYING ? "Playing" : "Paused with"} ${queue.length > 1 ? `${queuePosition+1}/${queue.length}` : `${queuePosition+1}`} tracks with a remaining length of \`${await secondsToTimestamp(totalDuration - player.getPosition())}\`.\n`;
        else description += `There are no tracks queued. Use /play while in a voice channel to add something!\n`;

        embed.setTitle(title);
        embed.setThumbnail(player.getCurrent()?.thumbnailUrl ?? null);
        embed.setDescription(description);
        embed.setFooter({text: 'Use /queue <page> to view specific pages'});


        return embed;
    }

    public createNowPlayingEmbed = async (guildId: string): Promise<EmbedBuilder> => {
        const player = this.guildQueueManager.get(guildId);
        const queue = player.getQueue();
        const progressInCurrentSong = await secondsToTimestamp(await player.getPosition());

        const embed = new EmbedBuilder()
            .setTimestamp()
            .setColor(player.getStatus() === MusicStatus.PLAYING ? 2067276 : 10038562)
            .setTitle(player.getStatus() === MusicStatus.PLAYING ? 'Now Playing' : 'Paused')
        ;

        
        const song = player.getCurrent();
        let playerStr = '';
        if (song) {
            const position = await player.getPosition()
            const barWidth = 15;
            const button = player.status === MusicStatus.PLAYING ? '⏹️' : '▶️';
            const dotPosition = Math.floor(barWidth * position / song.length);
            let progressBar = '';
            for (let i = 0; i < barWidth; i++) {
                if (i === dotPosition) {
                    progressBar += '🔘';
                } else {
                  progressBar += '▬';
                }
            }


            //const progressBar = getProgressBar(15, position / song.length);
            const elapsedTime = song.isLive ? 'live' : `${await secondsToTimestamp(position)}/${await secondsToTimestamp(song.length)}`;
            const loop = player.loopCurrentSong ? '🔁' : '';
            playerStr = `${button} ${progressBar} \`[${elapsedTime}]\` 🔉 ${loop}`;
            embed.setDescription(`**[${song?.title}](https://www.youtube.com/watch?v=${song?.url})**\nRequested By <@${song?.requestedBy}>\n${playerStr}`);
            embed.setThumbnail(song?.thumbnailUrl ?? null);
            embed.setFooter({text: `Source: ${song?.artist ?? 'Unknown'}`});
        } else {
            embed.setDescription('Nothing is currently playing');
        }

        
        return embed;
    }

    async getHttpLivestream(url: string): Promise<SongMetadata> {
        return new Promise((resolve, reject) => {
            ffmpeg(url).ffprobe((err, _) => {
              if (err) {
                reject();
              }
      
              resolve({
                url,
                source: MediaSource.HLS,
                isLive: true,
                title: url,
                artist: url,
                length: 0,
                offset: 0,
                playlist: null,
                thumbnailUrl: null,
              });
            });
          });
    }

}




// Manager for all guild queues
export class guildQueueManager {
    // Guild ID -> Player
    private readonly guildPlayers: Map<string, Player>;
    // private readonly fileCache: FileCacheProvider;

    constructor() {
        this.guildPlayers = new Map<string, Player>();
    }

    get(guildId: string): Player {
        let player = this.guildPlayers.get(guildId);
        if (!player) {
            player = new Player(guildId);
            this.guildPlayers.set(guildId, player);
        }
        return player;
    }
}