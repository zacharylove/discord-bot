import userModel, { UserInterface } from "../database/models/userModel";


// Creates new user entry in database
export const createNewUser = async (discordId: string) => {
    const newUser = userModel.create({
        userID: discordId,
        numPokes: 0,
        numPoked: 0,
        wordleDataID: null,
    })
    return newUser;
}

// Updates existing user entry in database
// TODO: Make generic so we can update any field for users!
export const updateUserData = async ( User: UserInterface) => {
    User.numPokes++;

    await User.save();
    return User;
    
}

// Gets user data from database
export const getUserData = async (userID: string): Promise<UserInterface> => {
    // Find entry matching id or create new entry if none exists
    const userData = 
    ( await userModel.findOne({ userID: userID }) ) ||
    ( await createNewUser(userID) );

    return userData;
}