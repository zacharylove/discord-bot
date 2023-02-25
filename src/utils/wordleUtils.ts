import { Message } from "discord.js";
import { wordleConfig } from "../config/config.json"

import { getWordleDataByUserID, update } from "../database/wordleData";

interface wordleInfo {
    authorID: string;
    wordleNum: number;
    score: number;
    emojis: string[];
    puzzleComplete: boolean;

}

export class wordle {
    wordLength: number;
    numGuesses: number;
    letterMatch: string[];
    letterClose: string[];
    letterWrong: string[];
    maxPuzzles: number;

    constructor() {
        // Load wordle info from config
        this.wordLength = wordleConfig.wordLength;
        this.numGuesses = wordleConfig.numGuesses;
        this.letterMatch = wordleConfig.letterMatch;
        this.letterClose = wordleConfig.letterClose;
        this.letterWrong = wordleConfig.letterWrong;
        this.maxPuzzles = wordleConfig.maxPuzzles;
    }

    /**
     * Cleans a wordle message and forms a dictionary with relevant info
     * 
     * @param message Message to be cleaned
     */
    cleanMessage = (message: Message) => {
        let output = {} as wordleInfo;
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
        output.wordleNum = puzzleNum;
        output.score = score;
        output.emojis = emojis;

        return output;
    }

    /**
     * Takes in a cleaned wordle result and runs a series of logical checks to ensure it is legitimate
     * Returns a boolean indicating whether the result is legitimate
     * @param wordleInfo 
     */
    checkWordleResult = (wordleInfo: wordleInfo): boolean => {
        // Did user complete the puzzle?
        const puzzleComplete = wordleInfo.score > 0;
        wordleInfo.puzzleComplete = puzzleComplete;

        let match: boolean;
        // If completed puzzle, last row should be full of match emojis
        if (puzzleComplete) {
            match = false;
            for (const matchEmoji of this.letterMatch) {
                // If the last row is all match emojis
                if (wordleInfo.emojis[wordleInfo.score - 1] == matchEmoji.repeat(this.wordLength)) {
                    match = true;
                    break;
                }
            }
        } 
        // If failed puzzle, no line should be full of match emojis
        else {
            match = true;
            for (const matchEmoji of this.letterMatch) {
                for (const emojiLine of wordleInfo.emojis) {
                    if (emojiLine != matchEmoji.repeat(this.wordLength)) {
                        match = false;
                        break;
                    }
                }
            }
        }

        // If completed, no other guesses should be shown beyond the line full of match emojis
        if (puzzleComplete && match && wordleInfo.score != 6) {
            // Select all lines beyond score
            const extraLines = wordleInfo.emojis.slice(wordleInfo.score);
            if (extraLines.length > 0) {
                match = false;
            }
        }

        // Can't have more than 6 guesses
        if (wordleInfo.score > 6) {
            match = false;
        }

        // Can't complete puzzles beyond the maximum number of wordle puzzles available
        if (wordleInfo.wordleNum > this.maxPuzzles) {
            match = false;
        }

        // Log result
        if (match) console.log("Wordle result is legitimate.");
        else console.log("Wordle result is illegitimate.");

        return match;
    }

    computeAverages = (totalGuesses: number, totalPuzzles: number, numComplete: number): [number, number] => {
        if (numComplete == 0 || totalPuzzles == 0) return [0, 0];
        const totalAverage = totalGuesses / (this.wordLength * totalPuzzles);
        const weightedScore = Math.round(1000 * (1 / totalAverage) * Math.log(totalPuzzles * numComplete / totalPuzzles));

        return [totalAverage, weightedScore];

    }


    /**
     * Stores a new wordle result into the database
     * @param wordleInfo 
     */
    storeWordleResult = async (wordleInfo: wordleInfo) => {
        console.log("Storing wordle result into database...");
        const userData = await getWordleDataByUserID(wordleInfo.authorID);

        // Check if user has a wordle data entry for this puzzle
        const puzzleData = userData.results.find( (result) => result.puzzleID == wordleInfo.wordleNum );
        if (puzzleData) {
            puzzleData.results.push(wordleInfo.emojis);
            puzzleData.scores.push(wordleInfo.score);

            
        } else {
            userData.results.push({
                puzzleID: wordleInfo.wordleNum,
                results: [wordleInfo.emojis],
                scores: [wordleInfo.score]
            });
        }

        // Update stats
        if (wordleInfo.puzzleComplete) userData.numComplete++;
        userData.totalPuzzles++;
        userData.totalGuesses += wordleInfo.score;

        // Compute and update averages
        const averages = this.computeAverages(userData.totalGuesses, userData.totalPuzzles, userData.numComplete);
        userData.totalAverage = averages[0];
        userData.weightedScore = averages[1];

        // Update user data
        console.log("Updating user data...");
        await update(userData);
    }
    

    /**
     * Parses incoming message content (from onMessage event) and determines whether it is a wordle result
     * 
     * @param message Message to be parsed
     */
    parseMessage = async (message: Message) => {
        const messageContent = message.content;
        // Whether message matches wordle pattern
        const patternMatch = messageContent.match("Wordle [0-9]+ [X|0-9]/6");
        // Whether the number of lines in message is correct
        const numLinesMatch = messageContent.split("\n").length <= this.numGuesses + 2;

        console.log(`Pattern match: ${patternMatch}, numLinesMatch: ${numLinesMatch}`);

        // If match
        if (patternMatch && numLinesMatch) {
            console.log("Message matches wordle pattern.");
            const cleanedMessage = this.cleanMessage(message);
            if ( this.checkWordleResult(cleanedMessage) ) {
                await message.react("✅");
                await this.storeWordleResult(cleanedMessage);
            } else {
                await message.react("❎");
            }
        }
    }
}

export const initializeWordleUtil = (): wordle => {
    return new wordle();
}