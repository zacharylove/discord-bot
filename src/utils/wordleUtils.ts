import { Message } from "discord.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { getWordleDataByUserID, update as wordleUpdate } from "../database/wordleData.js";
import { getTradleDataByUserID, update as tradleUpdate } from "../database/tradleData.js";


class sharedWordleUtils {

    /**
     * Takes in a cleaned wordle result and runs a series of logical checks to ensure it is legitimate
     * Returns a boolean indicating whether the result is legitimate
     * @param wordleInfo 
     */
    static checkWordleResult = (puzzleInfo: puzzleInfo, gameInfo: gameInfo): boolean => {
        // Did user complete the puzzle?
        const puzzleComplete = puzzleInfo.score > 0;
        puzzleInfo.puzzleComplete = puzzleComplete;

        let match: boolean;
        // If completed puzzle, last row should be full of match emojis
        if (puzzleComplete) {
            match = false;
            for (const matchEmoji of gameInfo.letterMatch) {
                // If the last row is all match emojis
                if (puzzleInfo.emojis[puzzleInfo.score - 1] == matchEmoji.repeat(gameInfo.solutionLength)) {
                    match = true;
                    break;
                }
            }
        } 
        // If failed puzzle, no line should be full of match emojis
        else {
            match = true;
            for (const matchEmoji of gameInfo.letterMatch) {
                for (const emojiLine of puzzleInfo.emojis) {
                    if (emojiLine != matchEmoji.repeat(gameInfo.solutionLength)) {
                        match = false;
                        break;
                    }
                }
            }
        }

        // If completed, no other guesses should be shown beyond the line full of match emojis
        if (puzzleComplete && match && puzzleInfo.score != 6) {
            // Select all lines beyond score
            const extraLines = puzzleInfo.emojis.slice(puzzleInfo.score);
            if (extraLines.length > 0) {
                match = false;
            }
        }

        // Can't have more than 6 guesses
        if (puzzleInfo.score > 6) {
            match = false;
        }

        // Can't complete puzzles beyond the maximum number of wordle puzzles available
        if (gameInfo.maxPuzzles && puzzleInfo.puzzleNum > gameInfo.maxPuzzles) {
            match = false;
        }

        // Log result
        if (match) console.debug("Wordle result is legitimate.");
        else console.debug("Wordle result is illegitimate.");

        return match;
    }

    static computeAverages = (totalGuesses: number, totalPuzzles: number, numComplete: number): [number, number] => {
        if (numComplete == 0 || totalPuzzles == 0) return [0, 0];
        const totalAverage = totalGuesses / (totalPuzzles);
        const weightedScore = Math.round(1000 * (1 / totalAverage) * Math.log(totalPuzzles * numComplete / totalPuzzles));

        return [totalAverage, weightedScore];

    }
}

interface gameInfo {
    solutionLength: number;
    letterMatch: string[];
    letterClose: string[];
    letterWrong: string[];
    numAllowedGuesses: number;
    maxPuzzles?: number;
}

interface puzzleInfo {
    authorID: string;
    puzzleNum: number;
    score: number;
    emojis: string[];
    puzzleComplete: boolean;

}

const wordleConfig = config.wordle.config;

// Wordle
export class wordle {
    info: gameInfo;
    

    constructor() {
        // Load wordle info from config
        this.info = {
            solutionLength: wordleConfig.wordLength,
            letterMatch: wordleConfig.letterMatch,
            letterClose: wordleConfig.letterClose,
            letterWrong: wordleConfig.letterWrong,
            maxPuzzles: wordleConfig.maxPuzzles,
            numAllowedGuesses: wordleConfig.numGuesses
        }
        
    }

    /**
     * Cleans a wordle message and forms a dictionary with relevant info
     * 
     * @param message Message to be cleaned
     */
    cleanMessage = (message: Message) => {
        let output = {} as puzzleInfo;
        output.authorID = message.author.id;

        // Split message into lines
        const messageLines = message.content.split("\n");
        // Status
        const status = messageLines[0].split(" ");
        const puzzleNum = parseInt(status[1]);
        // Score
        let score;
        if (status[2].split("/")[0] == "X") score = 0;
        else score = parseInt(status[2].split("/")[0]);
        // Emojis
        const emojis = messageLines.slice(-score);

        // Store into output
        output.puzzleNum = puzzleNum;
        output.score = score;
        output.emojis = emojis;

        return output;
    }

    /**
     * Stores a new wordle result into the database
     * @param wordleInfo 
     */
    storeWordleResult = async (puzzleInfo: puzzleInfo) => {
        console.debug("Storing wordle result into database...");
        const userData = await getWordleDataByUserID(puzzleInfo.authorID);

        // Check if user has a wordle data entry for this puzzle
        const puzzleData = userData.results.find( (result: any) => result.puzzleID == puzzleInfo.puzzleNum );
        if (puzzleData) {
            puzzleData.results.push(puzzleInfo.emojis);
            puzzleData.scores.push(puzzleInfo.score);

            
        } else {
            userData.results.push({
                puzzleID: puzzleInfo.puzzleNum,
                results: [puzzleInfo.emojis],
                scores: [puzzleInfo.score]
            });
        }

        // Update stats
        if (puzzleInfo.puzzleComplete) userData.numComplete++;
        userData.totalPuzzles++;
        userData.totalGuesses += puzzleInfo.score;

        // Compute and update averages
        const averages = sharedWordleUtils.computeAverages(userData.totalGuesses, userData.totalPuzzles, userData.numComplete);
        userData.totalAverage = averages[0];
        userData.weightedScore = averages[1];

        // Update user data
        console.debug("Updating user data...");
        await wordleUpdate(userData);
    }
    

    /**
     * Parses incoming message content (from onMessage event) and determines whether it is a wordle result
     * 
     * @param message Message to be parsed
     */
    parseMessage = async (message: Message) => {
        if (!message || !message.content || message.content == "" ) return "";
        const messageContent = message.content;
        // Whether message matches wordle pattern
        const patternMatch = messageContent.match("Wordle [0-9]+ [X|0-9]/6");
        // Whether the number of lines in message is correct
        const numLinesMatch = messageContent.split("\n").length <= this.info.numAllowedGuesses + 2;

        

        // If match
        if (patternMatch && numLinesMatch) {
            console.debug(`Pattern match: ${patternMatch}, numLinesMatch: ${numLinesMatch}`);
            console.debug("Message matches wordle pattern.");
            const cleanedMessage = this.cleanMessage(message);
            if ( sharedWordleUtils.checkWordleResult(cleanedMessage, this.info ) ) {
                await message.react("✅");
                await this.storeWordleResult(cleanedMessage);
            } else {
                await message.react("❎");
            }
        }
    }
}

const tradleConfig = config.tradle.config;

// Tradle
// Very similar to Wordle in a lot of ways... TODO: merge functionality?
export class tradle {
    info: gameInfo;

    constructor() {
        this.info = {
            solutionLength: tradleConfig.outputLength,
            letterMatch: tradleConfig.letterMatch,
            letterClose: tradleConfig.letterClose,
            letterWrong: tradleConfig.letterWrong,
            maxPuzzles: tradleConfig.maxPuzzles,
            numAllowedGuesses: tradleConfig.numGuesses
        }
    }

    /**
     * Cleans a tradle message and forms a dictionary with relevant info
     * 
     * @param message Message to be cleaned
     */
    cleanMessage = (message: Message) => {
        let output = {} as puzzleInfo;
        output.authorID = message.author.id;

        // Split message into lines
        const messageLines = message.content.split("\n");
        // Remove last line
        messageLines.pop();
        // Status
        const status = messageLines[0].split(" ");
        const puzzleNum = parseInt(status[1].replace("#", ""));
        // Score
        let score;
        if (status[2].split("/")[0] == "X") score = 0;
        else score = parseInt(status[2].split("/")[0]);
        // Emojis
        const emojis = messageLines.slice(-score);

        // Store into output
        output.puzzleNum = puzzleNum;
        output.score = score;
        output.emojis = emojis;

        return output;
    }

    storeTradleResult = async (puzzleInfo: puzzleInfo) => {
        console.debug("Storing tradle result into database...");
        const userData = await getTradleDataByUserID(puzzleInfo.authorID);

        // Update scores
        const puzzleData = userData.results.find( (result: any) => result.puzzleID == puzzleInfo.puzzleNum );
        if (puzzleData) {
            puzzleData.scores.push(puzzleInfo.score);
        } else {
            userData.results.push({
                puzzleID: puzzleInfo.puzzleNum,
                scores: [puzzleInfo.score]
            });
        }

        // Update stats
        if (puzzleInfo.puzzleComplete) userData.numComplete++;
        userData.totalPuzzles++;
        userData.totalGuesses += puzzleInfo.score;

        // Compute and update averages
        const averages = sharedWordleUtils.computeAverages(userData.totalGuesses, userData.totalPuzzles, userData.numComplete);
        userData.totalAverage = averages[0];
        userData.weightedScore = averages[1];

        // Update user data
        console.debug("Updating user data...");
        await tradleUpdate(userData);
    
    }

    parseMessage = async (message: Message) => {
        if (!message || !message.content || message.content == "" ) return "";
        const messageContent = message.content;
        const patternMatch = messageContent.match("#Tradle #[0-9]+ [X|0-9]/6");
        const numLinesMatch = messageContent.split("\n").length <= this.info.numAllowedGuesses + 2;

        if (patternMatch && numLinesMatch) {
            console.debug("Message matches tradle pattern.");
            const cleanedMessage = this.cleanMessage(message);
            if ( sharedWordleUtils.checkWordleResult(cleanedMessage, this.info ) ) {
                await message.react("✅");
                await this.storeTradleResult(cleanedMessage);
            } else {
                await message.react("❎");
            }
        }
    }
}

export const initializeWordleUtil = (): wordle => {
    return new wordle();
}

export const initializeTradleUtil = (): tradle => {
    return new tradle();
}