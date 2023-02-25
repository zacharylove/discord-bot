
import wordleModel, { WordleDataInterface, createNewWordleData } from "./models/wordleModel";



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
    return ( await wordleModel.findOne({ userID: userID}) ) || ( await createNewWordleData(userID) );
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