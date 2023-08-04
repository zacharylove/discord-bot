import tradleModel, { TradleDataInterface, createNewTradleData } from "./models/tradleModel";

/**
 * Updates an existing TradleData object in the database
 * @param tradleData 
 * @returns 
 */
export const update = async (tradleData: TradleDataInterface) => {
    await tradleData.save();
}

/**
 * Finds and returns a TradleData object from the database
 * Creates new TradleData object if none exists
 * @param userID 
 */
export const getTradleDataByUserID = async (userID: string): Promise<TradleDataInterface> => {
    return ( await tradleModel.findOne({ userID: userID}) ) || ( await createNewTradleData(userID) );
}

/**
 * Finds and returns a TradleData object with the (generated) ID matching the given ID
 * Throws error if none exists
 * @param id generated TradleData id
 * @throws Error
 */
export const getTradleDataByID = async (id: string): Promise<TradleDataInterface> => {
    const data = await tradleModel.findOne({ id: id});
    if (!data) {
        throw new Error(`No WordleData object with ID ${id} exists in the database.`);
    }
    return data;
    
}

/**
 * Calculates and returns the top global rankings based on user weighted score.
 * Sorts by name (ascending), then totalAverage (descending)
 * Group results into an object, with the name as the id and an items object containing all fields of the document for that name
 * Unwind this object to output a document for each element in the items array, with a new field called 'rank' containing the index (rank) of the element in the array
 * Replace the input document with this new document
 * Sort by totalAverage (descending), then name (ascending)
 * @returns 
 */
export const getRanking = async ()  => {
    return tradleModel.aggregate([
        { "$sort": {"name": 1, "weightedScore": -1} },
        { "$group": {
            "_id": "$name",
            "items": { "$push": "$$ROOT" }
        }},
        { "$unwind": { "path": "$items", "includeArrayIndex": "items.rank" } },
        { "$replaceRoot": { "newRoot": "$items" } },
        { "$sort": { "weightedScore": -1, "name": 1 } },
    ]);
}