// Interface for user object, used with database
// Each of the properties in the user database should be defined here
import { Document } from 'mongoose';

export interface UserInterface extends Document {
    // Discord ID of user
    discordId: string;

    // Number of times the user has run the 'poke' command, used for testing.
    numPokes: number;
    numPoked: number;
}