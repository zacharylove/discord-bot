import { Message } from "discord.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { getWordleDataByUserID, update as wordleUpdate } from "../database/wordleData.js";
import { getTradleDataByUserID, update as tradleUpdate } from "../database/tradleData.js";
import { WordleDataInterface } from "../database/models/wordleModel";
import { Canvas, CanvasRenderingContext2D, createCanvas } from "canvas";
import { convertLocalDateToUTC } from "./utils.js";


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
    cleanMessage = (message: string, authorID: string) => {
        let output = {} as puzzleInfo;
        output.authorID = authorID;

        // Split message into lines
        const messageLines = message.split("\n");
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
            if (puzzleData.results) puzzleData.results.push(puzzleInfo.emojis);
            else puzzleData.results = [puzzleInfo.emojis]
            if (puzzleData.scores) puzzleData.scores.push(puzzleInfo.score);
            else puzzleData.scores = [puzzleInfo.score]
            if (puzzleData.submissionDates) puzzleData.submissionDates.push(convertLocalDateToUTC(new Date()));
            else puzzleData.submissionDates = [convertLocalDateToUTC(new Date())]

            
        } else {
            userData.results.push({
                puzzleID: puzzleInfo.puzzleNum,
                results: [puzzleInfo.emojis],
                scores: [puzzleInfo.score],
                submissionDates: [convertLocalDateToUTC(new Date())]
            });
        }
        // If the last submission's puzzle number = today's puzzle number - 1
        if (userData.lastWordleNumber) {
            // Initialize streak
            if (!userData.wordleStreak) userData.wordleStreak = 1;
            // Increment streak
            else if (userData.lastWordleNumber == puzzleInfo.puzzleNum - 1) {
                userData.wordleStreak++;
                if (userData.longestStreak < userData.wordleStreak) userData.longestStreak = userData.wordleStreak
            }
            // Reset streak if not resubmitted puzzle
            else if (userData.lastWordleNumber != puzzleInfo.puzzleNum) {
                userData.wordleStreak = 1;
            }
        } 
        // If there is no lastWordleNumber (i.e, for users that are transitioning over from the timestamp-based streak), use timestamp to calculate whether streak continues
        // This should only occur once per user.
        else {
            if (userData.lastWordleSubmission) {
                if (!userData.wordleStreak) userData.wordleStreak = 1
                else {
                    const twoDaysAgo = new Date(convertLocalDateToUTC(new Date()).getTime() - (48 * 60 * 60 * 1000));
                    if (userData.lastWordleSubmission >= twoDaysAgo) {
                        userData.wordleStreak++;
                        if (userData.longestStreak < userData.wordleStreak) userData.longestStreak = userData.wordleStreak
                    } else if (userData.wordleStreak > 0) userData.wordleStreak = 0;
                }
            }
        }
        // Set the last submission puzzle number to today's puzzle
        userData.lastWordleNumber = puzzleInfo.puzzleNum;
        // Set last submission date to now
        userData.lastWordleSubmission = convertLocalDateToUTC(new Date());
        
        // For users that have records from before longest streak was implemented
        if (!userData.longestStreak) userData.longestStreak = 0;

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
        let messageContent = message.content;
        // Remove commas
        messageContent = messageContent.replaceAll(",", "");
        // Remove 🎉
        let specialEvent = false;
        if (messageContent.includes("🎉")) {
            specialEvent = true;
            messageContent = messageContent.replaceAll("🎉 ", "");
        }
        // Whether message matches wordle pattern
        const patternMatch = messageContent.match("Wordle [0-9]+ [X|0-9]/6");
        // Whether the number of lines in message is correct
        const numLinesMatch = messageContent.split("\n").length <= this.info.numAllowedGuesses + 2;

        

        // If match
        if (patternMatch && numLinesMatch) {
            console.debug(`Pattern match: ${patternMatch}, numLinesMatch: ${numLinesMatch}`);
            console.debug("Message matches wordle pattern.");
            const cleanedMessage = this.cleanMessage(messageContent, message.author.id);
            if ( sharedWordleUtils.checkWordleResult(cleanedMessage, this.info ) ) {
                await message.react("✅");
                if (specialEvent) await message.react("🎉");
                await this.storeWordleResult(cleanedMessage);

                // Notify streaks
                const userData = await getWordleDataByUserID(cleanedMessage.authorID);
                let replyMessage = "";
                let inOne = false;
                if (cleanedMessage.score == 1) {
                    replyMessage += "Holy shit";
                    await message.react("😮");
                    inOne = true;
                }
                if (userData.wordleStreak > 0) {
                    await message.react("🔥");
                    switch (userData.wordleStreak) {
                        case 5:
                            replyMessage += inOne ? "\nAlso, y" : "Nice! Y";
                            replyMessage += "ou're on a 5-day Wordle streak 🔥";
                            break;
                        case 7:
                            replyMessage += inOne ? ", and that's also " : "Great work! That's ";
                            replyMessage += "a 7-day Wordle streak 🔥🔥";
                            break;
                        case 14:
                            replyMessage += inOne ? "\nAlso that's a " : "Beautiful! A ";
                            replyMessage += "2-week Wordle streak 🔥🔥🔥";
                            break;
                        default:
                            if (userData.wordleStreak % 7 == 0) {
                                // Month
                                if ((userData.wordleStreak / 7) % 4 == 0) {
                                    replyMessage += inOne ? "\nAlso you're on a " : "Wow! A ";
                                    replyMessage += `${(userData.wordleStreak / 7)/4} month Wordle streak! 🔥🔥🔥`;
                                }
                                // Week
                                else {
                                    replyMessage += inOne ? "\nOh yeah, and that's a " : "You're on a ";
                                    replyMessage += `${userData.wordleStreak / 7} week Wordle streak! 🔥🔥🔥`;
                                }
                            }
                            break;
                    }
                }

                if (replyMessage != "") await message.reply(replyMessage);
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


// Calendar to show puzzle results per day
export const buildResultCalendar = async (canvas: Canvas, ctx: CanvasRenderingContext2D, wordleData: WordleDataInterface, startY: number, startX: number): Promise<any> => {

    // Get current date
    const currentDate = convertLocalDateToUTC(new Date());
    const month = currentDate.toLocaleString('default', { month: 'long' });
    const day = currentDate.getDate();
    const year = currentDate.getFullYear();

    var firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    var dayOfWeekFirstDayOfMonth = firstDayOfMonth.getDay();
    var lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    var lengthOfMonth = lastDayOfMonth.getDate();

    // Fill background
    ctx.fillStyle = "#ffffff";
    let height = lengthOfMonth == 31 ? 430 : 400;
    ctx.roundRect(startX, startY, 600, height, 20);
    ctx.fill();

    

    

    // Collect results within the current month
    // Create array (length of month) of -1, where values != -1 are scores for that day
    const resultArray = new Array(lengthOfMonth).fill(-1);

    // Number of days since epoch
    const fullDaysSinceEpoch = Math.floor(convertLocalDateToUTC(new Date()).getTime()/8.64e7);
    // Date of the first wordle puzzle in days since epoch
    const epochDateOfFirstWordle = 18797;
    // First day of month in days since epoch
    const firstDayOfMonthEpoch = Math.floor(firstDayOfMonth.getTime()/8.64e7);
    // So, any wordle result with a number >= this is within the month
    const firstDayOfMonthWordleResult = firstDayOfMonthEpoch - epochDateOfFirstWordle;

    let changed:boolean;
    for (const result of wordleData.results) {
        changed = false;
        let matchID = result.puzzleID && result.puzzleID > firstDayOfMonthWordleResult;
        
        if (result.submissionDates && result.submissionDates.length > 0) {
            let lastSubmissionDate = result.submissionDates.pop();
            let matchSubmissionDate = lastSubmissionDate && lastSubmissionDate <= firstDayOfMonth; 
            if (matchSubmissionDate && result.scores.length > 0) {
                resultArray[result.puzzleID - firstDayOfMonthWordleResult-1] = result.scores.pop()
                changed = true;
            }
        }
        if (!changed) {
            if (( matchID ) && result.scores.length > 0) {
                resultArray[result.puzzleID - firstDayOfMonthWordleResult-1] = result.scores.pop()
                changed = true;
            }
        }
        
        

        
    }

    // Set alignments
    const centerpoint = startX + (canvas.width - startX)/2
    const margin = 50;
    const padding = ((canvas.width - startX) - 2*margin) / 6;

    let x = startX;
    let y = startY + 35;

    // Center text
    ctx.fillStyle = "#000000"
    ctx.textAlign = "center";
    ctx.font = '24px sans-serif';
    ctx.fillText('Submissions for', centerpoint, y)
    y += 30
    ctx.font = 'bold 36px sans-serif'
    ctx.fillText(`${month} ${year}`, centerpoint, y);

    // Draw days of week
    ctx.fillStyle = "#5e5e5e";
    const daysOfWeek = ["S", "M", "T", "W", "T", "F", "S"]
    y += margin;
    x = startX + margin;
    ctx.font = 'bold 24 sans-serif'
    for (const day of daysOfWeek) {
        ctx.fillText(day, x, y)
        x += padding;
    }

    
    
    const startPointY =  startY + y + margin;
    const startPointX = startX + margin
    y = startPointY;
    x = startPointX;
    let currentCol = 0;
    // TODO: Draw connector between consecutive days
    /*
    for (let i = 1; i < lengthOfMonth-1; i++) {
        prevDay = resultArray[i-1];
        curDay = resultArray[i];
        nextDay = resultArray[i+1];
        // Start of streak
        if (prevDay == -1 && curDay != -1 && nextDay != -1) {
            startX = x;
            streakWidth += padding;
        }
        // End of streak
        if (prevDay != -1 && curDay != -1 && nextDay == -1) {
            streakWidth += padding;
            ctx.beginPath();
            ctx.rect(startX, y, streakWidth, 50);
            ctx.fill();
            startX = 0
        }
        // Continuing streak
        if (prevDay != -1 && curDay != -1 && nextDay != -1) {
            streakWidth += padding
        }


        x += padding;
    }
    */

    // Draw days of month
    ctx.font = '36px sans-serif'
    y = startPointY;
    x = startPointX;
    currentCol = 0;
    // Get first day of month (0 = sunday, 6 = saturday)
    for (let i = 0; i < dayOfWeekFirstDayOfMonth; i++) {
        currentCol++;
        x += padding;
    }
    let circleRadius = 25;
    let currentScore = -1;
    for (let i = 0; i < lengthOfMonth; i++) {
        currentScore = resultArray[i];
        if (currentScore != -1) {
            if (i == day-1) ctx.fillStyle = "#62d962";
            else ctx.fillStyle = '#90EE90';
            ctx.beginPath();
            ctx.arc(x, y-circleRadius/2, circleRadius, 0, 2 * Math.PI);
            ctx.fill();
        }

        // Current day
        if (i == day-1) {
            ctx.fillStyle = '#add8e6';
            ctx.beginPath();
            ctx.arc(x, y-circleRadius/2, circleRadius-3, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        // Number for day
        ctx.fillStyle = '#000000'
        ctx.fillText((i+1).toString(), x, y);
        if (currentCol == 6) {
            x = startPointX;
            y += margin;
            currentCol = 0;
        } else {
            currentCol++;
            x += padding;
        }
    }





    return [canvas, ctx];
}