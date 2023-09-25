import { Client, ClientOptions } from "discord.js";
import { Queuer, guildQueueManager } from "./utils/music/queuer.js";
import { wordle, tradle, initializeWordleUtil, initializeTradleUtil } from "./utils/wordleUtils.js";


/**
 * Custom client class that extends the default discord.js Client class
 * This allows us to add custom properties and methods to the client
 */
export default class Bot extends Client {
    private wordleUtil: wordle;
    private tradleUtil: tradle;
    private musicQueuerManager: guildQueueManager;
    private musicQueuer: Queuer;

    constructor( options: ClientOptions ) {
        super(options);
        this.wordleUtil = initializeWordleUtil();
        this.tradleUtil = initializeTradleUtil();
        this.musicQueuerManager = new guildQueueManager();
        this.musicQueuer = new Queuer(this.musicQueuerManager);
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
}