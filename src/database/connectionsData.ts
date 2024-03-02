import connectionsModel, { ConnectionsDataInterface, createNewConnectionsData } from "./models/connectionsModel.js";


/**
 * Updates an existing ConnectionsData object in the database
 * @param ConnectionsData 
 */
export const update = async (ConnectionsData: ConnectionsDataInterface) => {
    await ConnectionsData.save();
}

/**
 * Finds and returns a ConnectionsData object from the database
 * Creates new ConnectionsData object if none exists
 * @param userID 
 */
export const getConnectionsDataByUserID = async (userID: string): Promise<ConnectionsDataInterface> => {
    return ( await connectionsModel.findOne({ userID: userID}) ) || ( await createNewConnectionsData(userID) );
}

/**
 * Finds and returns a ConnectionsData object with the (generated) ID matching the given ID
 * Throws error if none exists
 * @param id generated ConnectionsData id
 * @throws Error
 */
export const getConnectionsDataByID = async (id: string): Promise<ConnectionsDataInterface> => {
    const data = await connectionsModel.findOne({ id: id});
    if (!data) {
        throw new Error(`No ConnectionsData object with ID ${id} exists in the database.`);
    }
    return data;
    
}