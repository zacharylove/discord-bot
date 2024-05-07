// For working with Connections submissions
import { Message } from "discord.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };
import { getConnectionsDataByUserID, update as connectionsUpdate } from "../database/connectionsData.js";

interface puzzleInfo {
    authorID: string,
    puzzleNum: number,
    guesses: number[];
    score: number;
    emojis: string[];
    puzzleComplete: boolean;
    perfect: boolean;
}

export class connections {

    computeAverages = (guesses: number[], totalGuesses: number[], totalPuzzles: number, numComplete: number): [number[] | null, number] => {
        if (numComplete == 0 || totalPuzzles == 0) return [null, 0];
        let averages = [0,0,0,0];
        averages[0] = totalGuesses[0] / totalPuzzles;
        averages[1] = totalGuesses[1] / totalPuzzles;
        averages[2] = totalGuesses[2] / totalPuzzles;
        averages[3] = totalGuesses[3] / totalPuzzles;
        let totalAverage = 0;
        averages.forEach(num => { totalAverage += num});
        totalAverage /= 4;

        const weightedScore = Math.round(1000 * (1 / totalAverage) * Math.log(totalPuzzles * numComplete / totalPuzzles));
        return [averages, weightedScore];
    }

    storeConnectionsResult = async (puzzleInfo: puzzleInfo) => {
        console.debug("Storing connections result into database...");
        const userData = await getConnectionsDataByUserID(puzzleInfo.authorID);

        // Check if user has a connections data entry for this puzzle
        const puzzleData = userData.results.find( (result: any) => result.puzzleID == puzzleInfo.puzzleNum );
        if (puzzleData) {
            if (puzzleData.results) puzzleData.results.push(puzzleInfo.emojis);
            else puzzleData.results = [puzzleInfo.emojis]
            if (puzzleData.guesses) puzzleData.guesses.push(puzzleInfo.guesses);
            else puzzleData.guesses = [puzzleInfo.guesses]
            if (puzzleData.scores) puzzleData.scores.push(puzzleInfo.score);
            else puzzleData.scores = [puzzleInfo.score]
            if (puzzleData.submissionDates) puzzleData.submissionDates.push(new Date());
            else puzzleData.submissionDates = [new Date()]
        } else {
            userData.results.push({
                puzzleID: puzzleInfo.puzzleNum,
                results: [puzzleInfo.emojis],
                guesses: [puzzleInfo.guesses],
                scores: [puzzleInfo.score],
                submissionDates: [new Date()]
            });
        }
        // If the previous submission is the previous puzzle number, increment streak
        let streakIncremented = false;
        if (userData.lastPuzzleSubmitted == puzzleInfo.puzzleNum - 1) {
            if (!userData.streak) userData.streak = 1;
            else {
                userData.streak++;
                streakIncremented = true;
                if (userData.longestStreak < userData.streak) userData.longestStreak = userData.streak;
            }
        } else if (userData.streak > 0 && userData.lastPuzzleSubmitted != puzzleInfo.puzzleNum) userData.streak = 0;

        // Update stats
        if (puzzleInfo.perfect) userData.perfectPuzzles = userData.perfectPuzzles ? userData.perfectPuzzles + 1 : 1;
        userData.totalPuzzles = userData.totalPuzzles ? userData.totalPuzzles + 1 : 1;
        if (puzzleInfo.puzzleComplete) userData.numComplete = userData.numComplete ? userData.numComplete + 1 : 1;
        userData.lastPuzzleSubmitted = puzzleInfo.puzzleNum;
        userData.totalGuesses[0] += puzzleInfo.guesses[0];
        userData.totalGuesses[1] += puzzleInfo.guesses[1];
        userData.totalGuesses[2] += puzzleInfo.guesses[2];
        userData.totalGuesses[3] += puzzleInfo.guesses[3];

        // Compute and update averages
        const averages = this.computeAverages(puzzleInfo.guesses, userData.totalGuesses, userData.totalPuzzles, userData.numComplete);
        if (averages[0]) userData.totalAverageGuesses = averages[0];
        userData.weightedScore = averages[1];

        // Update user data
        console.debug("Updating user data...");
        await connectionsUpdate(userData);

        return streakIncremented;
    }

    cleanMessage = (message: Message) => {
        let output = {} as puzzleInfo;
        output.authorID = message.author.id;

        // Split message into lines
        const messageLines = message.content.split("\n");
        // Puzzle ID
        output.puzzleNum = parseInt(messageLines[1].split(" ")[1].replace("#", ""));
        // Run through the remaining lines and look for completed groups
        let groupAGuesses = 0;
        let groupBGuesses = 0;
        let groupCGuesses = 0;
        let groupDGuesses = 0;

        let numGuesses = 0;

        for (let lineNum = 2; lineNum < messageLines.length; lineNum++ ) {
            numGuesses++;
            if (messageLines[lineNum] == config.connections.config.groupA.repeat(4)) {
                groupAGuesses = numGuesses;
                numGuesses = 0;
            }
            else if (messageLines[lineNum] == config.connections.config.groupB.repeat(4)) {
                groupBGuesses = numGuesses;
                numGuesses = 0;
            }
            else if (messageLines[lineNum] == config.connections.config.groupC.repeat(4)) {
                groupCGuesses = numGuesses;
                numGuesses = 0;
            }
            else if (messageLines[lineNum] == config.connections.config.groupD.repeat(4)) {
                groupDGuesses = numGuesses;
                numGuesses = 0;
            }
        }
        // Set scores
        output.guesses = [groupAGuesses, groupBGuesses, groupCGuesses, groupDGuesses]
        // Set puzzle complete
        if (groupAGuesses == 0 || groupBGuesses == 0 || groupCGuesses == 0 || groupDGuesses == 0) output.puzzleComplete = false;
        else output.puzzleComplete = true;
        // Set emojis
        output.emojis = messageLines.slice(2);

        // Score (1 is best, 0 is worst)
        output.score = (groupAGuesses + groupBGuesses + groupCGuesses + groupDGuesses) / 4;
        if (output.score == 1) output.perfect = true;
        else output.perfect = false;

        return output;
    }

    parseMessage = async (message: Message) => {
        if (!message || !message.content || message.content == "" ) return "";
        const messageContent = message.content;
        const reg = new RegExp("Connections ?\nPuzzle #[0-9]+\n");
        // Check whether first line of message matches connections pattern
        const patternMatch = messageContent.match(reg);
        // Connections has a variable number of lines, but we can remove the text and check if the remaining message is comprised entirely of connections emojis
        // We'll remove all connections emoji from the string and check if the length is 0
        // This is kind of janky but whatever it works
        const groupA = config.connections.config.groupA;
        const groupB = config.connections.config.groupB;
        const groupC = config.connections.config.groupC;
        const groupD = config.connections.config.groupD;
        const contentMatch = messageContent.replace(reg, "").replaceAll(groupA, "").replaceAll(groupB, "").replaceAll(groupC, "").replaceAll(groupD, "").replaceAll("\n", "").length == 0;
        
        if (patternMatch && contentMatch) {
            console.debug(`Message ${messageContent} matches Connections pattern.`);
            let cleanedMessage;
            try {
                cleanedMessage = this.cleanMessage(message);
            } catch (e) {
                console.error(`Error parsing Connections Result: ${messageContent}`);
                return;
            }
            let streakIncremented = false;
            try {
                streakIncremented = await this.storeConnectionsResult(cleanedMessage);
            } catch (e) {
                console.error(`Error while updating connections data: ${e}`);
                return;
            }
            // Puzzle is completed
            if (cleanedMessage.puzzleComplete) {
                await message.react("✅");
                // Notify streaks
                if (streakIncremented) {
                    const userData = await getConnectionsDataByUserID(cleanedMessage.authorID);
                    await message.react("🔥");
                    switch (userData.streak) {
                        case 5:
                            await message.reply("Nice! You're on a 5-day Connections streak 🔥");
                            break;
                        case 7:
                            await message.reply("Great work! That's a 7-day Connections streak 🔥🔥")
                            break;
                        case 14:
                            await message.reply("Beautiful! A 2-week Connections streak 🔥🔥🔥")
                            break;
                        default:
                            if (userData.streak % 7 == 0) {
                                // Month
                                if ((userData.streak / 7) % 4 == 0) await message.reply(`Wow! A ${(userData.streak / 7)/4} month Connections streak! 🔥🔥🔥`);
                                // Week
                                else await message.reply(`You're on a ${userData.streak / 7} week Connections streak! 🔥🔥🔥`);
                            }
                            break;
                    }
                }

            }
            // Puzzle is not completed
            else {
                await message.react("❎");
            }
        }
    }
}


export const initializeConnectionsUtil = (): connections => {
    return new connections();
}