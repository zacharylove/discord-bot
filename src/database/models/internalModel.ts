// For bot use only
import { Document, model, Schema } from 'mongoose';
import { CommandInterface } from "../../interfaces/Command.js";
// @ts-ignore
import { default as config } from "../../config/config.json" assert { type: "json" };

export interface InternalInterface extends Document {
    openedThreads: Thread[];
}

export interface Thread {
    threadID: string;
    channelID: string;
    createdAt: Date;
    type: string;
}

export const Internal = new Schema({
    openedThreads: new Array<Thread>(),
});

// ONLY RUN ONCE TO CREATE COLLECTION
export const createInternalData = async () => {
    console.log(`Creating new internal data...`);
    return internalModel.create({
        openedThreads: [],
    });
}

const internalModel = model<InternalInterface>("Internal", Internal);
export default internalModel;