
import Bot from "./bot.js";
import { onInteraction } from "./events/onInteraction.js";
import { IntentOptions, PartialsOptions } from "./config/IntentOptions.js";
import { connectDatabase } from "./database/connectDatabase.js";
import { validateEnv, validateEventPermissions } from "./utils/validateProperties.js";
import { onReady } from "./events/onReady.js";
import { onMessage } from "./events/onMessage.js";
import { Events, TextChannel } from "discord.js";
import { onMessageReactionAdd, onMessageReactionRemove } from "./events/onMessageReaction.js";
import { createInternalData } from "./database/models/internalModel.js";


let BOT: Bot;

// Cleanup dangling threads on startup
import { removeAllThreads, getNumThreads, getThreads, removeThread, getInternalData } from "./database/internalData.js";
import { Thread } from "./database/models/internalModel.js";
const cleanupThreads = async () => {
    // If this is the first time the bot is running, create the internal data
    if (await getInternalData() === null) {
        console.log("Internal data does not exist in database- creating collection...");
        await createInternalData();
    }
    console.log("Checking for dangling threads...");
    let threadMessage = "";
    const numThreads = await getNumThreads();
    let numErrors = 0;
    let numSuccess = 0;
    if ( numThreads > 0) {
        threadMessage += `${numThreads} threads found. Cleaning... `;
        const threads: Thread[] = await getThreads();
        for (const thread of threads) {
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
        threadMessage += `${numSuccess} deleted, ${numErrors} errors.`;
        threadMessage += ` Cleanup complete.${numErrors > 0 ? `${await getNumThreads()} threads remaining..` : ''}`;
    } else {
        threadMessage += " No threads found.";
    }
    console.log(threadMessage);
}


const registerEvents = async (BOT: Bot) => {
    if (validateEventPermissions(onReady.properties)) {
        BOT.on(Events.ClientReady, async () => await onReady.run(BOT));
    } else { console.log("onReady event is disabled. Skipping..."); }

    if (validateEventPermissions(onInteraction.properties)) {
        BOT.on(Events.InteractionCreate, async (interaction) => await onInteraction.run(interaction));
    } else { console.log("interactionCreate event is disabled. Skipping..."); }

    if (validateEventPermissions(onMessage.properties)) {
        BOT.on(Events.MessageCreate, async (Message) => await onMessage.run(Message, BOT))
    } else { console.log("messageCreate event is disabled. Skipping..."); }

    if (validateEventPermissions(onMessageReactionAdd.properties)) {
        BOT.on(Events.MessageReactionAdd, async (reaction, user) => await onMessageReactionAdd.run(reaction, user));
    } else { console.log("messageReactionAdd event is disabled. Skipping..."); }

    if (validateEventPermissions(onMessageReactionRemove.properties)) {
        BOT.on(Events.MessageReactionRemove, async (reaction, user) => await onMessageReactionRemove.run(reaction, user));
    } else { console.log("messageReactionAdd event is disabled. Skipping..."); }
}


// This anonymous immediately-invoked function expression (IIFE) is the entry point of program
(async () => {
    if (!await validateEnv()) return; 

    BOT = new Bot({ intents: IntentOptions, partials: PartialsOptions });

    await connectDatabase();

    await registerEvents(BOT);

    //await createInternalData();

    await BOT.login(process.env.BOT_TOKEN);

    await cleanupThreads();
   
})();

export { BOT }