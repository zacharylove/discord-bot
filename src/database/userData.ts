import userModel, { UserInterface, createNewUser } from "../database/models/userModel";


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