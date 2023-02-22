// Database model for a user
import { Document, model, Schema } from 'mongoose';
import { UserInterface } from 'interfaces/User';

export const User = new Schema({
    discordId: String,
    numPokes: Number,
    numPoked: Number,
});

export default model<UserInterface>('User', User);