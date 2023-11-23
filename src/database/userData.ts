import { FilterQuery } from "mongoose";
import userModel, { UserInterface, createNewUser } from "../database/models/userModel.js";


/**
 * Updates existing user entry in database
 * @param User 
 */
export const updateUserData = async ( User: UserInterface) => {
    await User.save();
}

/**
 * Gets user data from database
 * @param userID 
 * @returns 
 */
export const getUserData = async (userID: string): Promise<UserInterface> => {
    // Find entry matching id or create new entry if none exists
    const userData = 
    ( await userModel.findOne({ userID: userID }) ) ||
    ( await createNewUser(userID) );

    return userData;
}

/**
 * Counts the number of user documents matching the given filter
 * @param filter 
 * @returns 
 */
export const countUsers = async ( filter?: FilterQuery<UserInterface>) => {
    return filter ? await userModel.countDocuments(filter) : await userModel.countDocuments({});
}