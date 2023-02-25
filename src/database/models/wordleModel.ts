// Database model for a user's wordle data
import { Document, model, Schema, ObjectId, Types } from 'mongoose';
import { getUserData } from '../userData';


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
    }[];
    totalGuesses: number;
    totalPuzzles: number;
    numComplete: number;
    totalAverage: number;
    weightedScore: number;
    
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
});

const wordleModel = model<WordleDataInterface>('WordleData', WordleData, "wordle");

/**
 * Creates and returns an empty WordleData object
 * @param userID 
 * @returns 
 */
export const createNewWordleData = async (userID: string) => {
    console.log(`Creating new WordleData object for user ${userID}...`)
    const newWordle = wordleModel.create({
        _id: new Types.ObjectId(),
        userID: userID,
        results: new Array({
            puzzleID: Number,
            results: new Array<String>(),
            scores: new Array<Number>(),
        }),
        totalGuesses: 0,
        totalPuzzles: 0,
        numComplete: 0,
        totalAverage: 0,
        weightedScore: 0,
    });

    // Set user's db entry to point to this new wordle data
    const user = await getUserData(userID);
    user.wordleDataID = (await newWordle)._id;
    await user.save();

    return newWordle;
}

export default wordleModel;