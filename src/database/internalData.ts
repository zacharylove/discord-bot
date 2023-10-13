import internalModel, { Thread } from "./models/internalModel.js";
// @ts-ignore
import { default as config } from "../config/config.json" assert { type: "json" };

export const getInternalData = async () => {
    return internalModel.findOne();
}

export const update = async (data: any) => {
    const internalData = await getInternalData();
    internalData!.set(data);
    await internalData!.save();
}


/* ==================== THREADS ==================== */

export const addThread = async (threadID: string, channelID: string, type: string) => {
    const thread: Thread = {
        threadID: threadID,
        channelID: channelID,
        createdAt: new Date(),
        type: type,
    }
    const internalData = await getInternalData();
    internalData!.openedThreads.push(thread);
    await update(internalData);
}

export const removeThread = async (threadID: string) => {
    const internalData = await getInternalData();
    internalData!.openedThreads = internalData!.openedThreads.filter(thread => thread.threadID !== threadID);
    await update(internalData);
}

export const removeAllThreads = async () => {
    const internalData = await getInternalData();
    internalData!.openedThreads = [];
    await update(internalData);
}

export const getThreads = async (): Promise<Thread[]> => {
    const internalData = await getInternalData();
    return internalData!.openedThreads;
}

export const getNumThreads = async (): Promise<number> => {
    const internalData = await getInternalData();
    return internalData!.openedThreads.length;
}