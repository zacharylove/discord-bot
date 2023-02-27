

import { Client, Message } from "discord.js";
import { onInteraction } from "./events/onInteraction";
import { IntentOptions } from "./config/IntentOptions";
import { connectDatabase } from "./database/connectDatabase";
import { validateEnv, validateIntents } from "./utils/validateProperties";
import { onReady } from "./events/onReady";
import { onMessage } from "./events/onMessage";
// Load config
import { initializeWordleUtil } from "./utils/wordleUtils";

const registerEvents = async (BOT: Client) => {

    // Initialize wordle
    const WordleUtil = initializeWordleUtil();

    if (onReady.properties.Enabled && validateIntents(onReady.properties.Intents, "onReady", "event")) {
        BOT.on("ready", async () => await onReady.run(BOT));
    } else { console.log("onReady event is disabled. Skipping..."); }

    if (onInteraction.properties.Enabled && validateIntents(onInteraction.properties.Intents, "onInteraction", "event")) {
        BOT.on("interactionCreate", async (interaction) => await onInteraction.run(interaction));
    } else { console.log("interactionCreate event is disabled. Skipping..."); }

    if (onMessage.properties.Enabled && validateIntents(onMessage.properties.Intents, "onMessage", "event")) {
        BOT.on("messageCreate", async (Message) => await onMessage.run(Message, WordleUtil))
    } else { console.log("messageCreate event is disabled. Skipping..."); }
}

// This anonymous immediately-invoked function expression (IIFE) is the entry point of program
(async () => {
    if (!validateEnv()) return; 

    const BOT = new Client({ intents: IntentOptions });

    await connectDatabase();

    await registerEvents(BOT);

    console.log("Setup complete. Logging in...");
    await BOT.login(process.env.BOT_TOKEN);
})();