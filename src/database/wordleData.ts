import wordleModel, { WordleDataInterface, createNewWordleData } from "./models/wordleModel.js";



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
 * @throws Error
 */
export const getWordleDataByID = async (id: string): Promise<WordleDataInterface> => {
    const data = await wordleModel.findOne({ id: id});
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
    return wordleModel.aggregate([
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

export const getGlobalWordleStats = async () => {
    var numWordleResults = 0;
    var numWordleGuesses = 0;
    const users = await wordleModel.find({});
    for (const user of users) {
        numWordleResults += user.totalPuzzles;
        numWordleGuesses += user.totalGuesses;
    }

    return {
        numWordleResults: numWordleResults,
        numWordleGuesses: numWordleGuesses
    }
}

/*
    For internal use only!! Updates all documents, for when we're adding fields or whatever.
*/
export const updateAllDocuments = async () => {
    // Step 1: Run the aggregation pipeline to transform documents
    // Put your aggregation function here!
    let transformedDocuments = await wordleModel.aggregate([]);
  
    // Step 2: Prepare bulk write operations
    let bulkOperations: any = [];
    transformedDocuments.forEach(document => {
        bulkOperations.push({
        updateOne: {
            filter: { _id: document._id },
            update: { $set: { results: document.results } }
        }
        });
    });
    
    // Step 3: Execute bulk write operations
    wordleModel.bulkWrite(bulkOperations);

    console.debug("Updated!")
}