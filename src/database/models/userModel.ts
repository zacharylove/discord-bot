// Database model for a user
import { Document, model, ObjectId, Schema, Types } from 'mongoose';


// Interface for user object, used with database
// Each of the properties in the user database should be defined here

export interface UserInterface extends Document {
    // Discord ID of user
    userID: string;

    // Number of times the user has run the 'poke' command, used for testing.
    numPokes: number;
    numPoked: number;

    // ID for WordleData
    wordleDataID: ObjectId;
}

export const User = new Schema({
    userID: String,
    numPokes: Number,
    numPoked: Number,
    wordleDataID: Types.ObjectId,
});

const userModel = model<UserInterface>('User', User);

/**
 * Creates and returns an empty UserModel object
 * @param userID 
 * @returns 
 */
export const createNewUser = async (discordId: string) => {
    const newUser = userModel.create({
        userID: discordId,
        numPokes: 0,
        numPoked: 0,
        wordleDataID: null,
    })
    return newUser;
}

export default userModel;