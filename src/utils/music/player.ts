/*
// The idea is that each guild will have a separate player object

Based on Muse
Requirements:
 - @discordjs/voice: Voice connection
 - @discordjs/opus: Opus encoder
 - ffmpeg-static: FFmpeg
 - libsodium-wrappers + libsodium: Encryption
 - ytdl-core: YouTube downloader
 - fs-capacitor: filestream supporting simultaneous read/write and multiple independent streams with low delay
 - fluent-ffmpeg: Abstraction library for ffmpeg, avoids needing CLI usage
*/

import { Message, Snowflake, VoiceChannel } from "discord.js";
import * as playdl from 'play-dl';

import {   
    AudioPlayer,
    AudioPlayerState,
    AudioPlayerStatus,
    createAudioPlayer,
    createAudioResource, 
    DiscordGatewayAdapterCreator,
    joinVoiceChannel,
    StreamType,
    VoiceConnection,
    VoiceConnectionStatus,
} from "@discordjs/voice";
import { Readable } from "stream";
import ytdl, {videoFormat} from 'ytdl-core';
//import { WriteStream } from "fs-capacitor";
import ffmpeg from 'fluent-ffmpeg';
import { WriteStream } from "fs-capacitor";
import { shuffleArray, sleep } from "../../utils/utils.js";
import { createEmbed, refreshEmbed } from "../../commands/slashCommands/music/queue.js";
export enum MusicStatus {
    PLAYING,
    PAUSED,
    IDLE,
}

type YTDLVideoFormat = videoFormat & {loudnessDb?: number};

/* ==================== */
// Music Interfaces
/* ==================== */
export interface QueuedPlaylist {
    title: string;
    source: string;
    url?: string;
}
export enum MediaSource {
    Youtube,
    HLS,
    SoundCloud,
}
export interface SongMetadata {
    title: string;
    artist: string;
    url: string;
    length: number;
    offset: number;
    playlist: QueuedPlaylist | null;
    isLive: boolean;
    thumbnailUrl: string | null;
    source: MediaSource;
}
export interface QueuedSong extends SongMetadata {
    addedInChannelId: Snowflake;
    requestedBy: string;
}

export interface storedQueueMessage {
    message: Message<boolean>,
    page: number,
    guildId: string,
}

export default class Player {
    public voiceConnection: VoiceConnection | null = null;
    public status = MusicStatus.PAUSED;
    public guildId: string;
    public loopCurrentSong = false;

    public currentVoiceChannel: VoiceChannel | null = null;

    private queue: QueuedSong[] = [];
    private queuePosition = 0;
    private audioPlayer: AudioPlayer | null = null;
    private nowPlaying: QueuedSong | null = null;
    private playPositionInterval: NodeJS.Timeout | undefined;
    private lastSongURL = '';

    private positionInSeconds = 0;
    //private readonly fileCache: FileCacheProvider;
    private disconnectTimer: NodeJS.Timeout | null = null;

    // One queue message per server
    public activeQueueMessage: storedQueueMessage | null = null;
    

    constructor(guildId: string) {
        this.guildId = guildId;
    }

    // ====================
    // Queue Management
    // ====================

    // Skip Backward
    goBackward(num: number): boolean {
        // If we can go backward
        if ((this.queuePosition - num) >= 0) {
            this.queuePosition -= num;
            this.positionInSeconds = 0;
            this.stopTrackingPosition();
            return true;
        } else {
            // Return to beginning of song if on first
            if (this.queuePosition == 0) {
                this.positionInSeconds = 0;
                this.stopTrackingPosition();
                this.seek(0);
                return true;
            }
            console.error(`Cannot go backward ${num} songs`);
            return false;
        }
    }

    async backward(num: number): Promise<boolean> {
        const success: boolean = this.goBackward(num);
        try {
            if (this.getCurrent() && this.status !== MusicStatus.PAUSED) await this.play();
            // Disconnect if something funky happened
            else {
                this.audioPlayer?.stop();
                this.status = MusicStatus.IDLE;
                // Disconnect after 30s
                const disconnectTimer = 30;
                this.disconnectTimer = setTimeout(() => {
                    if (this.status === MusicStatus.IDLE) this.disconnect();
                }, disconnectTimer * 1000);
            }
        } catch (error: unknown) {
            this.queuePosition++;
            console.error(error);
            return false;
        }
        return success ? true : false;
    }
    
    // Skip forward
    goForward(num: number): boolean {
        // If we can go forward
        if ((this.queuePosition + num - 1) < this.queue.length) {
            this.queuePosition += num;
            this.positionInSeconds = 0;
            this.stopTrackingPosition();
            return true;
        } else {
            console.error(`Cannot go forward ${num} songs`);
            return false;
        }
    }
    // Skip forward
    async forward(num: number): Promise<boolean> {
        const success: boolean = this.goForward(num);
        try {
            if (this.getCurrent() && this.status !== MusicStatus.PAUSED) await this.play();
            else {
                this.audioPlayer?.stop();
                this.status = MusicStatus.IDLE;
                // Disconnect after 30s
                const disconnectTimer = 30;
                this.disconnectTimer = setTimeout(() => {
                    if (this.status === MusicStatus.IDLE) this.disconnect();
                }, disconnectTimer * 1000);
            }

            // Update queue embed after a delay (to stop discord api from freaking out)
            sleep(2000).then( async () => {
                if (this.activeQueueMessage) {
                    await refreshEmbed(this.activeQueueMessage);
                }
            });


        } catch (error: unknown) {
            this.queuePosition--;
            console.error(error);
            return false;
        }
        return success ? true : false;
    }

    // Shuffle queue
    async shuffle(): Promise<void> { 
        // Shuffle all songs after current song
        
        const shuffledSongs = shuffleArray(this.queue.slice(this.queuePosition + 1));
        
        this.queue = [...this.queue.slice(0, this.queuePosition + 1), ...shuffledSongs];
    }

    // Clear queue
    clear(clearCurrent: boolean): void {
        if (clearCurrent) {
            this.queue = [];
            this.queuePosition = 0;
            if (this.status === MusicStatus.PLAYING) {
                this.pause();
            }
            this.audioPlayer?.stop();
        } else {
            this.queue = this.queue.slice(0, this.queuePosition + 1);
        }
    }

    getQueue(): QueuedSong[] {
        return this.queue;
    }

    // ====================
    // Track Management
    // ====================

    add(song: QueuedSong, immediate?: boolean): void {
        if (song.playlist || !immediate) {
            // Add to end of queue
            this.queue.push(song);
          } else {
            // Add as the next song to be played
            const insertAt = this.queuePosition + 1;
            this.queue = [...this.queue.slice(0, insertAt), song, ...this.queue.slice(insertAt)];
        }
    }

    // Get currently playing song
    getCurrent(): QueuedSong | null {
        if (this.queue[this.queuePosition]) {
          return this.queue[this.queuePosition];
        }
    
        return null;
    }

    // Get position (seconds) in song
    getPosition(): number {
        return this.positionInSeconds;
    }

    // Get current position (#) in queue
    getQueuePosition(): number {
        return this.queuePosition;
    }

    // Get player status
    getStatus(): MusicStatus {
        return this.status;
    }

    // Play song
    async play(): Promise<void> {
        if (!this.voiceConnection) throw new Error('Not connected to a voice channel.');
        const currentSong = this.getCurrent();
        if (!currentSong) throw new Error('No song currently playing');
        // Remove awaited disconnects
        if (this.disconnectTimer) {
            clearInterval(this.disconnectTimer);
            this.disconnectTimer = null;
        }

        // If song is currently paused, resume it
        if (this.status === MusicStatus.PAUSED && currentSong.url === this.nowPlaying?.url) {
            if (this.audioPlayer) {
              this.audioPlayer.unpause();
              this.status = MusicStatus.PLAYING;
              this.startTrackingPosition();
              return;
            }
      
            // Was disconnected, need to recreate stream
            if (!currentSong.isLive) {
              return this.seek(this.getPosition());
            }
        }

        // Otherwise, play the song
        try {
            let positionSeconds: number | undefined;
            let to: number | undefined;
            if (currentSong.offset !== undefined) {
                positionSeconds = currentSong.offset;
                to = currentSong.length + currentSong.offset;
            }


            this.audioPlayer = createAudioPlayer({
                behaviors: {
                    // Needs to be somewhat high for livestreams
                    maxMissedFrames: 50,
                },
            });

            let stream, resource;
            if (currentSong.source == MediaSource.SoundCloud) {
                stream = await playdl.stream(currentSong.url);
                resource = createAudioResource(stream.stream, {
                    inputType: stream.type,
                });

            } else {
                stream = await this.getStream(currentSong, {seek: positionSeconds, to});
                resource = createAudioResource(stream, {
                    inputType: StreamType.WebmOpus,
                });
            }
            
            this.voiceConnection.subscribe(this.audioPlayer);
            this.audioPlayer.play(resource);

            this.attachVCListeners();

            this.status = MusicStatus.PLAYING;
            this.nowPlaying = currentSong;

            if (currentSong.url === this.lastSongURL) {
                this.startTrackingPosition();
            } else {
                // Reset position counter
                this.startTrackingPosition(0);
                this.lastSongURL = currentSong.url;
            }
        } catch (error: unknown) {
            // Try to skip to next song
            await this.forward(1);
      
            if ((error as {statusCode: number}).statusCode === 410 && currentSong) {
              const channelId = currentSong.addedInChannelId;
      
              if (channelId) {
                console.debug(`${currentSong.title} is unavailable`);
                return;
              }
            }
      
            throw error;
        }
    }
    // Stop playing
    stop(): number {
        this.disconnect();
        this.queuePosition = 0;
        const prevQueueNum = this.queue.length;
        this.queue = [];
        this.status = MusicStatus.IDLE;
        return prevQueueNum;
    }

    // Pause song
    pause(): void {
        if (this.status !== MusicStatus.PLAYING) {
          throw new Error('Not currently playing.');
        }
        this.status = MusicStatus.PAUSED;
        if (this.audioPlayer) this.audioPlayer.pause();
    
        this.stopTrackingPosition();
    }

    // Resume song
    resume(): void {
        if (this.status !== MusicStatus.PAUSED) {
            throw new Error('Not currently paused.');
        }
        this.audioPlayer?.unpause();
        this.status = MusicStatus.PLAYING;
        this.startTrackingPosition();
    }

    // Start tracking position in song
    private startTrackingPosition(initalPosition?: number): void {
        if (initalPosition !== undefined) {
          this.positionInSeconds = initalPosition;
        }
    
        if (this.playPositionInterval) {
          clearInterval(this.playPositionInterval);
        }
    
        this.playPositionInterval = setInterval(() => {
          this.positionInSeconds++;
        }, 1000);
    }
    // Stop tracking position in song
    private stopTrackingPosition(): void {
        if (this.playPositionInterval) {
          clearInterval(this.playPositionInterval);
        }
    }

    // Seek in current song
    async seek(positionSeconds: number): Promise<void> {
        this.status = MusicStatus.PAUSED;
    
        if (this.voiceConnection === null) {
          throw new Error('Not connected to a voice channel.');
        }
    
        const currentSong = this.getCurrent();
    
        if (!currentSong) {
          throw new Error('No song currently playing');
        }
    
        if (positionSeconds > currentSong.length) {
          throw new Error('Seek position is outside the range of the song.');
        }
    
        let realPositionSeconds = positionSeconds;
        let to: number | undefined;
        if (currentSong.offset !== undefined) {
          realPositionSeconds += currentSong.offset;
          to = currentSong.length + currentSong.offset;
        }
    
        this.audioPlayer = createAudioPlayer({
            behaviors: {
                // Needs to be somewhat high for livestreams
                maxMissedFrames: 50,
            },
        });

        let stream, resource;
        if (currentSong.source == MediaSource.SoundCloud) {
            stream = await playdl.stream(currentSong.url);
            resource = createAudioResource(stream.stream, {
                inputType: stream.type,
            });

        } else {
            stream = await this.getStream(currentSong, {seek: positionSeconds, to});
            resource = createAudioResource(stream, {
                inputType: StreamType.WebmOpus,
            });
        }
        
        this.voiceConnection.subscribe(this.audioPlayer);
        this.audioPlayer.play(resource);
        this.attachVCListeners();
        this.startTrackingPosition(positionSeconds);
    
        this.status = MusicStatus.PLAYING;
    }


    // ====================
    // Video parsing
    // ====================

    // Create a read stream of a video
    private async createReadStream(options: {url: string, ffmpegInputOptions?: string[], cacheKey?: string, cache?: boolean, volumeAdjustment?: string}): Promise<Readable> {
        return new Promise((resolve, reject) => {
            let writeStream = new WriteStream();
            if (!writeStream || writeStream == undefined) throw new Error('WriteStream not initialized');
            
            /*
            if (options?.cache) {
                const cacheStream = this.fileCache.createWriteStream(this.getHashForCache(options.cacheKey));
                capacitor.createReadStream().pipe(cacheStream);
            }
            */

            const readStream = writeStream.createReadStream();
            let isReadStreamClosed: boolean = false;

            const stream = ffmpeg(options.url)
                .inputOptions(options?.ffmpegInputOptions ?? ['-re'])
                .noVideo()
                .audioCodec('libopus')
                .outputFormat('webm')
                .addOutputOption(['-filter:a', `volume=${options?.volumeAdjustment ?? '1'}`])
                .on('error', error => {
                    console.error(error)
                    if (!isReadStreamClosed) {
                        reject(error);
                    }
            }).on('start', command => {
                console.debug(`Spawned ffmpeg with ${command as string}`);
            });
            stream.pipe(writeStream);

            // Close pipe when read stream is closed
            readStream.on('close', () => {
                stream.kill('SIGKILL');
                isReadStreamClosed = true;
            });
    
            resolve(readStream);
        });
    }

    // Helper function,Finds the next best format if not available
    private  nextBestFormat = (formats: ytdl.videoFormat[]): ytdl.videoFormat | undefined => {
        // If livestream
        if (formats[0].isLive) {
            // Filter out bad typings
            formats = formats.sort((a, b) => (b as unknown as {audioBitrate: number}).audioBitrate - (a as unknown as {audioBitrate: number}).audioBitrate);
            return formats.find(format => [128, 127, 120, 96, 95, 94, 93].includes(parseInt(format.itag as unknown as string, 10)));
        }
        // If not livestream, find the highest bitrate
        formats = formats
            .filter(format => format.averageBitrate)
            .sort((a,b) => (a && b) ? b.averageBitrate! - a.averageBitrate! : 0);
        return formats.find(format => !format.bitrate) ?? formats[0];
    }

    private async getStream(song: QueuedSong, options: {}): Promise<Readable> {

        let ffmpegInput: string | null;
        const ffmpegInputOptions: string[] = [];
        let format: YTDLVideoFormat | undefined = undefined;
        let shouldCacheVideo = false;
        // TODO: cache downloaded videos like Muse does
        ffmpegInput = null;
        // If not cached yet, download
        if (!ffmpegInput) {
            const videoInfo = await ytdl.getInfo(song.url);
            const availableFormats = videoInfo.formats as YTDLVideoFormat[];
            // Look for opus 48000Hz
            const filter = (format: ytdl.videoFormat): boolean => format.codecs === 'opus' && format.container === 'webm' && format.audioSampleRate !== undefined && parseInt(format.audioSampleRate, 10) === 48000;
            format = availableFormats.find(filter);
            if (!format) {
                format = this.nextBestFormat(videoInfo.formats);
                // If no format is found still, error
                if (!format) {
                    throw new Error('No suitable format found');
                }
            }
            console.debug(`Using format ${format.itag} for ${song.url}`);

            ffmpegInput = format.url;
            // Do not attempt to cache live videos
            const MAX_CACHE_LENGTH_SECONDS = 30 * 60; // 30 minutes
            shouldCacheVideo = !videoInfo.player_response.videoDetails.isLiveContent && parseInt(videoInfo.videoDetails.lengthSeconds, 10) < MAX_CACHE_LENGTH_SECONDS; // && !options.seek
            console.debug(`Should cache video: ${shouldCacheVideo}`);
            // Set ffmpeg to reconnect once every 5 seconds(?)
            ffmpegInputOptions.push(...[
                '-reconnect', '1',
                '-reconnect_streamed', '1',
                '-reconnect_delay_max', '5',
            ]);            
        }

        // Seek options
        /*
        if (options.seek) {
            ffmpegInputOptions.push('-ss', options.seek.toString());
        }

        if (options.to) {
            ffmpegInputOptions.push('-to', options.to.toString());
        }
        */

        // Create and return a stream
        // TODO: Support cacheKey, cache, volumeAdjustment
        return this.createReadStream({
            url: ffmpegInput,
            ffmpegInputOptions,
        });
        


        
    }


    // ====================
    // Voice Channel Management
    // ====================

    async connect(channel: VoiceChannel): Promise<void> {
        this.voiceConnection = joinVoiceChannel({
          channelId: channel.id,
          guildId: channel.guild.id,
          adapterCreator: channel.guild.voiceAdapterCreator as DiscordGatewayAdapterCreator,
        });

        // Disable keepalive
        this.voiceConnection.on('stateChange', (oldState, newState) => {
            /* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
            const oldNetworking = Reflect.get(oldState, 'networking');
            const newNetworking = Reflect.get(newState, 'networking');
      
            const networkStateChangeHandler = (_: any, newNetworkState: any) => {
              const newUdp = Reflect.get(newNetworkState, 'udp');
              clearInterval(newUdp?.keepAliveInterval);
            };
      
            oldNetworking?.off('stateChange', networkStateChangeHandler);
            newNetworking?.on('stateChange', networkStateChangeHandler);
            /* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call */
        });
        this.currentVoiceChannel = channel;
    }

    disconnect(): void {
        if (this.voiceConnection) {
          if (this.status === MusicStatus.PLAYING) {
            this.pause();
          }
    
          this.loopCurrentSong = false;
          this.voiceConnection.destroy();
          this.audioPlayer?.stop();
    
          this.voiceConnection = null;
          this.audioPlayer = null;
          this.currentVoiceChannel = null;
        }
    }

    // Disconnect from VC
    private onVoiceConnectionDisconnect(): void {
        this.disconnect();
    }

    // When audio player is idle
    private async onAudioPlayerIdle(_oldState: AudioPlayerState, newState: AudioPlayerState): Promise<void> {
        // Automatically advance queued song at end
        if (this.loopCurrentSong && newState.status === AudioPlayerStatus.Idle && this.status === MusicStatus.PLAYING) {
          await this.seek(0);
          return;
        }
    
        if (newState.status === AudioPlayerStatus.Idle && this.status === MusicStatus.PLAYING) {
          await this.forward(1);
        }
    }

    private attachVCListeners(): void {
        if (!this.voiceConnection) return;
        if (this.voiceConnection.listeners(VoiceConnectionStatus.Disconnected).length === 0) {
            this.voiceConnection.on(VoiceConnectionStatus.Disconnected, this.onVoiceConnectionDisconnect.bind(this));
        }
    
        if (!this.audioPlayer) {
            return;
        }
    
        if (this.audioPlayer.listeners('stateChange').length === 0) {
        this.audioPlayer.on(AudioPlayerStatus.Idle, this.onAudioPlayerIdle.bind(this));
        }
    }

    
}