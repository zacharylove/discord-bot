import { Client, ClientOptions } from "discord.js";
import { wordle, tradle, initializeWordleUtil, initializeTradleUtil } from "./utils/wordleUtils";


/**
 * Custom client class that extends the default discord.js Client class
 * This allows us to add custom properties and methods to the client
 */
export class Bot extends Client {
    private wordleUtil: wordle;
    private tradleUtil: tradle;

    constructor( options: ClientOptions ) {
        super(options);
        this.wordleUtil = initializeWordleUtil();
        this.tradleUtil = initializeTradleUtil();
    }

    public getWordleUtil = (): wordle => {
        return this.wordleUtil;
    }
    public getTradleUtil = (): tradle => {
        return this.tradleUtil;
    }
}