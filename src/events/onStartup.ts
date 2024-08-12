
// Cleanup dangling threads on startup
import { createInternalData } from "../database/models/internalModel.js";
import { getNumThreads, getThreads, removeThread, getInternalData } from "../database/internalData.js";
import { Thread } from "../database/models/internalModel.js";
import { TextChannel } from "discord.js";
import { BOT } from "../index.js";
import { purgeCommandLog } from "../database/guildData.js";
import { convertLocalDateToUTC } from "../utils/utils.js";


export const cleanupThreads = async () => {
    // If this is the first time the bot is running, create the internal data
    if (await getInternalData() === null) {
        console.log("Internal data does not exist in database- creating collection...");
        await createInternalData();
    }
    console.log(`Checking for dangling threads with debug mode ${process.env.DEBUG_MODE}...`);
    let threadMessage = "";
    const numThreads = await getNumThreads(process.env.DEBUG_MODE);
    let numErrors = 0;
    let numSuccess = 0;
    let numIgnored = 0;
    if ( numThreads > 0) {
        threadMessage += `${numThreads} threads found. Cleaning... `;
        const threads: Thread[] = await getThreads(process.env.DEBUG_MODE);
        for (const thread of threads) {
            // Ignore qotd threads
            if (thread.type == "qotd") {
                numIgnored++;
                continue;
            }
            const channel = await BOT.channels.fetch(thread.channelID);
            if (channel) {
                const fetchedChannel = await channel.fetch();
                let threadChannel = null;
                if (channel instanceof TextChannel) {
                    threadChannel = channel.threads.cache.find(x => x.id = thread.threadID);
                }                
                if (threadChannel) {
                    await threadChannel.delete();
                    numSuccess++;
                    await removeThread(thread.threadID);
                } else {
                    numErrors++;
                }
            }
        }
        threadMessage += `${numSuccess} deleted, ${numErrors} errors. ${numIgnored} threads ignored.`;
        threadMessage += ` Cleanup complete.${numErrors > 0 ? `${await getNumThreads(process.env.DEBUG_MODE)} threads remaining..` : ''}`;
    } else {
        threadMessage += " No threads found.";
    }
    console.log(threadMessage);
}

// Deletes command logs in all servers that are older than one month
export const cleanupCommandLogs = async () => {
    let currentDate = convertLocalDateToUTC(new Date());
    currentDate.setMonth(currentDate.getMonth() - 1);
    await purgeCommandLog(currentDate);
}