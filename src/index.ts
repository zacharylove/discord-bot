

import { Client, Message } from "discord.js";
import { onInteraction } from "./events/onInteraction";
import { IntentOptions } from "./config/IntentOptions";
import { connectDatabase } from "./database/connectDatabase";
import { validateEnv } from "./utils/validateEnv";
import { onReady } from "./events/onReady";
import { onMessage } from "./events/onMessage";
// Load config
import { initializeWordleUtil } from "./utils/wordleUtils";

// This anonymous immediately-invoked function expression (IIFE) is the entry point of program
(async () => {
    if (!validateEnv()) return; 

    const BOT = new Client({ intents: IntentOptions });

    await connectDatabase();

    // Initialize wordle
    const WordleUtil = initializeWordleUtil();

    BOT.on("ready", async () => await onReady(BOT));

    BOT.on("interactionCreate", async (interaction) => await onInteraction(interaction));

    BOT.on("messageCreate", async (Message) => await onMessage(Message, WordleUtil))

    console.log("Setup complete. Logging in...");
    await BOT.login(process.env.BOT_TOKEN);
})();