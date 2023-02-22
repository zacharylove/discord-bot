

import { Client } from "discord.js";
import { onInteraction } from "./events/onInteraction";
import { IntentOptions } from "./config/IntentOptions";
import { connectDatabase } from "./database/connectDatabase";
import { validateEnv } from "./utils/validateEnv";
import { onReady } from "./events/onReady";

// This anonymous immediately-invoked function expression (IIFE) is the entry point of program
(async () => {
    if (!validateEnv()) return; 

    const BOT = new Client({
        intents: IntentOptions,
    });

    BOT.on("ready", async () => await onReady(BOT));

    await connectDatabase();

    BOT.on("interactionCreate", async (interaction) => {
        await onInteraction(interaction);
    });

    await BOT.login(process.env.BOT_TOKEN);
})();