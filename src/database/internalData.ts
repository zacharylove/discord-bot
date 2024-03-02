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
        localDev: process.env.DEBUG_MODE ? process.env.DEBUG_MODE : "false",
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

export const getThreads = async (debug?: string): Promise<Thread[]> => {
    let isDebug = debug ? debug : "false";
    const internalData = await getInternalData();
    return internalData!.openedThreads.filter(thread => thread.localDev === isDebug);
}

export const getNumThreads = async (debug?: string): Promise<number> => {
    // Get number of threads with localDev = debug
    let isDebug = debug ? debug : "false";
    const internalData = await getInternalData();
    // Ignore qotd threads
    return internalData!.openedThreads.filter(thread => thread.localDev === isDebug && thread.type != "qotd").length;
}