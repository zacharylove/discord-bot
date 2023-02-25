// Database model for a user's wordle data
import { Document, model, Schema, ObjectId, Types } from 'mongoose';


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

export default model<WordleDataInterface>('WordleData', WordleData, "wordle");