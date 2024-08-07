// Database model for a user's wordle data
import { Document, model, Schema, ObjectId, Types } from 'mongoose';
import { getUserData } from '../userData.js';


export interface WordleDataInterface extends Document {
    _id: ObjectId;
    userID: string;
    // Each entry in results represents a distinct puzzle
    results: {
        puzzleID: number;
        // Set of all results submitted for that puzzle (as an array of lines)
        results: string[][];
        // Set of all scores submitted for that puzzle (as an array of numbers)
        scores: number[];
        // Submission dates (epoch date = submission created before this field was added)
        submissionDates: Date[];
    }[];
    totalGuesses: number;
    totalPuzzles: number;
    numComplete: number;
    totalAverage: number;
    weightedScore: number;
    wordleStreak: number;
    lastWordleSubmission: Date;
    lastWordleNumber: number;
    longestStreak: number;
}

export const WordleData = new Schema({
    _id: Types.ObjectId,
    userID: String,
    results: new Array(),
    totalGuesses: Number,
    totalPuzzles: Number,
    numComplete: Number,
    totalAverage: Number,
    weightedScore: Number,
    wordleStreak: Number,
    lastWordleSubmission: Date,
    lastWordleNumber: Number,
    longestStreak: Number,
});

const wordleModel = model<WordleDataInterface>('WordleData', WordleData, "wordle");

/**
 * Creates and returns an empty WordleData object
 * @param userID 
 * @returns 
 */
export const createNewWordleData = async (userID: string) => {
    console.debug(`Creating new WordleData object for user ${userID}...`);
    const newWordle = wordleModel.create({
        _id: new Types.ObjectId(),
        userID: userID,
        results: new Array({
            puzzleID: -1,
            results: new Array<String>(),
            scores: new Array<Number>(),
            submissionDates: new Array<Date>(),
        }),
        totalGuesses: 0,
        totalPuzzles: 0,
        numComplete: 0,
        totalAverage: 0,
        weightedScore: 0,
        wordleStreak: 0,
        longestStreak: 0,
        lastWordleSubmission: new Date(0),
        lastWordleNumber: -1,
    });

    // Set user's db entry to point to this new wordle data
    const user = await getUserData(userID);
    user.wordleDataID = (await newWordle)._id;
    await user.save();

    return newWordle;
}

export default wordleModel;