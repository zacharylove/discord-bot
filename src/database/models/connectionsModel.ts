// Database model for a user's connections data
import { Document, model, Schema, ObjectId, Types } from 'mongoose';
import { getUserData } from '../userData.js';

export interface ConnectionsDataInterface extends Document {
    _id: ObjectId;
    userID: string;
    results: {
        puzzleID: number;
        // Result string(s)
        results: string[][];
        // Number of guesses for each group (format: [num, num, num, num])
        guesses: number[][];
        // Score
        scores: number[];
        // Date of submission(s)
        submissionDates: Date[];
    }[];
    // Perfect solutions
    perfectPuzzles: number;
    totalPuzzles: number;
    numComplete: number;
    totalGuesses: number[];
    // Average guesses for each group, format [num, num, num, num]
    totalAverageGuesses: number[];
    weightedScore: number;
    streak: number;
    longestStreak: number;
    // Puzzle id of the last submission
    lastPuzzleSubmitted: number;
}

export const ConnectionsData = new Schema({
    _ud: Types.ObjectId,
    userID: String,
    results: new Array(),
    perfectPuzzles: Number,
    totalPuzzles: Number,
    numComplete: Number,
    totalGuesses: new Array(),
    totalAverageGuesses: new Array(),
    weightedScore: Number,
    streak: Number,
    longestStreak: Number,
    lastPuzzleSubmitted: Number
});

const connectionsModel = model<ConnectionsDataInterface>('ConnectionsData', ConnectionsData, "connections");


/**
 * Creates and returns an empty ConnectionsData object
 * @param userID 
 * @returns 
 */
export const createNewConnectionsData = async (userID: string) => {
    console.debug(`Creating new ConnectionsData object for user ${userID}...`);
    const newConnections = connectionsModel.create({
        _id: new Types.ObjectId(),
        userID: userID,
        results: new Array(),
        perfectPuzzles: 0,
        totalPuzzles: 0,
        numComplete: 0,
        totalGuesses: [0,0,0,0],
        totalAverageGuesses: [0,0,0,0],
        weightedScore: 0,
        streak: 0,
        longestStreak: 0,
        lastPuzzleSubmitted: -1,
    });

    // Update user data with connections
    const user = await getUserData(userID);
    user.connectionsDataID = (await newConnections)._id;
    await user.save();

    return newConnections;
}

export default connectionsModel;