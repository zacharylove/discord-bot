import mongoose from "mongoose";
import wordleModel, { WordleData, WordleDataInterface } from "./models/wordleModel";
import { getUserData } from "./userData";

/**
 * Creates and returns an empty WordleData object
 * @param userID 
 * @returns 
 */
export const createNew = async (userID: string) => {
    console.log(`Creating new WordleData object for user ${userID}...`)
    const newWordle = wordleModel.create({
        _id: new mongoose.Types.ObjectId(),
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

/**
 * Updates an existing WordleData object in the database
 * @param wordleData 
 * @returns 
 */
export const update = async (wordleData: WordleDataInterface) => {
    await wordleData.save();
}

/**
 * Finds and returns a WordleData object from the database
 * Creates new WordleData object if none exists
 * @param userID 
 */
export const getWordleDataByUserID = async (userID: string): Promise<WordleDataInterface> => {
    return ( await wordleModel.findOne({ userID: userID}) ) || ( await createNew(userID) );
}

/**
 * Finds and returns a WordleData object with the (generated) ID matching the given ID
 * Throws error if none exists
 * @param id generated wordledata id
 */
export const getWordleDataByID = async (id: string): Promise<WordleDataInterface> => {
    const data = await wordleModel.findOne({ id: id});
    if (!data) {
        throw new Error(`No WordleData object with ID ${id} exists in the database.`);
    }
    return data;
    
}