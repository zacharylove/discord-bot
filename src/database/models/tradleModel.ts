// Database model for a user's tradle data
import { Document, model, Schema, ObjectId, Types } from 'mongoose';
import { getUserData } from '../userData';

// NOTE: Although Tradle data is basically identical to Wordle, we still want it stored in a separate collection
// And we also want to make this extensible for other wordle-type games that have different outputs and values.
export interface TradleDataInterface extends Document {
    _id: ObjectId;
    userID: string;

    // Each entry in results represents a distinct puzzle
    results: {
        puzzleID: number;
        // Set of all scores submitted for that puzzle (as an array of numbers)
        scores: number[];
    }[];
    totalGuesses: number;
    totalPuzzles: number;
    numComplete: number;
    totalAverage: number;
    weightedScore: number;
}

export const TradleData = new Schema({
    _id: Types.ObjectId,
    userID: String,
    results: new Array(),
    totalGuesses: Number,
    totalPuzzles: Number,
    numComplete: Number,
    totalAverage: Number,
    weightedScore: Number,
});

const tradleModel = model<TradleDataInterface>('TradleData', TradleData, "tradle");

/**
 * Creates and returns an empty TradleData object
 * @param userID 
 * @returns 
 */
export const createNewTradleData = async (userID: string) => {
    console.debug(`Creating new TradleData object for user ${userID}...`);
    const newTradle = tradleModel.create({
        _id: new Types.ObjectId(),
        userID: userID,
        results: new Array({
            puzzleID: Number,
            scores: new Array<Number>(),
        }),
        totalGuesses: 0,
        totalPuzzles: 0,
        numComplete: 0,
        totalAverage: 0,
        weightedScore: 0,
    });

    const user = await getUserData(userID);
    user.tradleDataID = ( await newTradle )._id;
    await user.save();
    return newTradle;
}

export default tradleModel;