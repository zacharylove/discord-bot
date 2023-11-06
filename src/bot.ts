import { Client, ClientOptions } from "discord.js";
import { Queuer, guildQueueManager } from "./utils/music/queuer.js";
import { wordle, tradle, initializeWordleUtil, initializeTradleUtil } from "./utils/wordleUtils.js";
import SpotifyWebApi from "spotify-web-api-node";
import { toggleMusicCommands } from "./commands/_CommandList.js";
import pRetry from "p-retry";
import * as fs from 'fs';
import path from 'path'
import { fileURLToPath } from 'url';
import { dirname } from 'path';

/**
 * Custom client class that extends the default discord.js Client class
 * This allows us to add custom properties and methods to the client
 */
export default class Bot extends Client {
    private wordleUtil: wordle;
    private tradleUtil: tradle;
    private musicQueuerManager: guildQueueManager;
    private musicQueuer: Queuer;
    private spotifyAPI: SpotifyWebApi;
    private spotifyTokenTimerId: NodeJS.Timeout | undefined;
    private wordleWordList: string[];
    private wordleAllowedGuessList: string[];
    private wordleChallengeWordList: string[];

    constructor( options: ClientOptions ) {
        super(options);
        this.wordleUtil = initializeWordleUtil();
        this.tradleUtil = initializeTradleUtil();
        this.musicQueuerManager = new guildQueueManager();
        this.musicQueuer = new Queuer(this.musicQueuerManager);

        let spotifyAPIValid: boolean = true;
        
        this.spotifyAPI = new SpotifyWebApi({
            clientId: process.env.SPOTIFY_CLIENT_ID,
            clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
            redirectUri: 'http://localhost/'
        });
        this.initializeSpotifyAPI();
      
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        this.wordleWordList = fs.readFileSync(path.resolve(path.join(__dirname, '..', 'assets', 'txt', 'wordleWords.txt')),'utf8').split('\n');
        this.wordleAllowedGuessList = fs.readFileSync(path.resolve(path.join(__dirname, '..', 'assets', 'txt', 'validWordleGuesses.txt')),'utf8').split('\n');
        this.wordleChallengeWordList = fs.readFileSync(path.resolve(path.join(__dirname, '..', 'assets', 'txt', 'challengeWordleWords.txt')),'utf8').split('\n');
    }

    private initializeSpotifyAPI = async (): Promise<void> => {
        await this.refreshSpotifyToken();
        try {
            this.spotifyAPI.getArtistAlbums('43ZHCT0cAZBISjO8DG9PnE').then(
                function(data) {
                    console.log('Spotify API connected!');
                },
                function(err) {
                    console.error(err);
                    toggleMusicCommands(false);
                }
            );
        } catch (e) { 
            console.error(e); 
            toggleMusicCommands(false);
        }
    }

    private refreshSpotifyToken = async () => {
        await pRetry(async () => {
            const auth = await this.spotifyAPI.clientCredentialsGrant();
            this.spotifyAPI.setAccessToken(auth.body.access_token);
            this.spotifyTokenTimerId = setTimeout(this.refreshSpotifyToken.bind(this), (auth.body.expires_in / 2) * 1000);
          }, {retries: 5});  
    }

    public getWordleUtil = (): wordle => {
        return this.wordleUtil;
    }
    public getTradleUtil = (): tradle => {
        return this.tradleUtil;
    }
    public getMusicQueuerManager = (): guildQueueManager => {
        return this.musicQueuerManager;
    }
    public getMusicQueuer = (): Queuer => {
        return this.musicQueuer;
    }
    public getSpotifyAPI = (): SpotifyWebApi => {
        return this.spotifyAPI;
    public getWordleWordList = (): string[] => {
        return this.wordleWordList;
    }
    public getWordleAllowedGuessList = (): string[] => {
        return this.wordleAllowedGuessList;
    }
    public getWordleChallengeWordList = (): string[] => {
        return this.wordleChallengeWordList;
    }
}