import { Client, ClientOptions } from "discord.js";
import { Queuer, guildQueueManager } from "./utils/music/queuer.js";
import { wordle, tradle, initializeWordleUtil, initializeTradleUtil } from "./utils/wordleUtils.js";
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
    private wordleWordList: string[];
    private wordleAllowedGuessList: string[];
    private wordleChallengeWordList: string[];

    constructor( options: ClientOptions ) {
        super(options);
        this.wordleUtil = initializeWordleUtil();
        this.tradleUtil = initializeTradleUtil();
        this.musicQueuerManager = new guildQueueManager();
        this.musicQueuer = new Queuer(this.musicQueuerManager);

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = dirname(__filename);
        this.wordleWordList = fs.readFileSync(path.resolve(path.join(__dirname, '..', 'assets', 'txt', 'wordleWords.txt')),'utf8').split('\n');
        this.wordleAllowedGuessList = fs.readFileSync(path.resolve(path.join(__dirname, '..', 'assets', 'txt', 'validWordleGuesses.txt')),'utf8').split('\n');
        this.wordleChallengeWordList = fs.readFileSync(path.resolve(path.join(__dirname, '..', 'assets', 'txt', 'challengeWordleWords.txt')),'utf8').split('\n');
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