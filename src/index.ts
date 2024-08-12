
import Bot from "./bot.js";
import { onInteraction } from "./events/onInteraction.js";
import { IntentOptions, PartialsOptions } from "./config/IntentOptions.js";
import { connectDatabase } from "./database/connectDatabase.js";
import { validateEnv, validateEventPermissions } from "./utils/validateProperties.js";
import { onReady } from "./events/onReady.js";
import { onMessage } from "./events/onMessage.js";
import { Events } from "discord.js";
import { onMessageReactionAdd, onMessageReactionRemove } from "./events/onMessageReaction.js";
import { getCurrentUTCDate, logErrorToFile } from "./utils/utils.js";
import { cleanupCommandLogs, cleanupThreads, logMaintenenceEventToFile } from "./events/onMaintenance.js";

let BOT: Bot;



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

// Executes maintenence methods every day at 1AM UTC
const performMaintenanceTasks = async (doItNow: boolean = false) => {
    let millisTill1AM;
    if (doItNow) millisTill1AM = 1;
    else {
        // Check whether it is 1AM
        const now = getCurrentUTCDate();
        millisTill1AM = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 1, 0, 0, 0).getTime() - now.getTime();
        if (millisTill1AM < 0) {
            millisTill1AM += 86400000; // it's after 1am, try 1am tomorrow.
        }
    }

    // Run tasks
    await new Promise(resolve => setTimeout(resolve, millisTill1AM)).then( async () => {
        console.log("Performing daily maintenence tasks...");
        await await logMaintenenceEventToFile("==== BEGINNING MAINTENENCE TASKS ====")
        await cleanupThreads();
        await cleanupCommandLogs()
        await await logMaintenenceEventToFile("======= END MAINTENENCE TASKS =======")
    });

}


// This anonymous immediately-invoked function expression (IIFE) is the entry point of program
(async () => {
    if (!await validateEnv()) return; 

    BOT = new Bot({ intents: IntentOptions, partials: PartialsOptions });

    await connectDatabase();

    await registerEvents(BOT);

    //await createInternalData();

    await BOT.login(process.env.BOT_TOKEN);

    await performMaintenanceTasks();
   
})();

// Log crashes to file
process.on('uncaughtException', function (err: any) {
    logErrorToFile(err, 'uncaughtException');
});
process.on('unhandledRejection', function (err: any) {
    logErrorToFile(err, 'unhandledRejection');
});

export { BOT }