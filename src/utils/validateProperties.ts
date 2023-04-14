// Validates environment variables to ensure they are not undefined

import { GatewayIntentBits } from "discord.js";
import { IntentOptions } from "../config/IntentOptions";
import { toTitleCase } from "./utils";

export const validateEnv = () => {
    console.log("Validating environment variables...")
    if (!process.env.BOT_TOKEN) {
        console.warn("Missing Discord bot token!");
        return false;
    }
    if (!process.env.MONGO_URI) {
        console.warn("Missing MongoDB Atlas connection string!");
        return false;
    }
    if (!process.env.GUILD_ID) {
        console.warn("Missing guild ID!");
        // No return, not a big deal
    }
    if (!process.env.TICK_INTERVAL) {
        console.warn("Missing tick interval!");
        return false;
    }
    if (!process.env.DEBUG_MODE) {
        console.warn("Missing debug mode!");
    } else if (process.env.DEBUG_MODE.toLowerCase() === "true") {
        console.log("Debug mode is enabled!");
    }
    
    if (!process.env.DEBUG_MODE || process.env.DEBUG_MODE.toLowerCase() !== "true") {
        // Disable debug logging if not in debug mode
        console.debug = () => {};
        console.log("==Debug logging disabled==");
        console.debug("test");
    }
    console.log("Environment variables look OK!")
    return true;
}

/**
 * Validates whether the intents requested by an event or command are registered by the client
 * @param requestedIntents 
 * @param name 
 * @returns 
 */
export const validateIntents = (requestedIntents: GatewayIntentBits[] | undefined, name?: string, type?: string) => {
    if (!requestedIntents) return true;
    else if (!requestedIntents.every(val => IntentOptions.includes(val))) {
        if (!name) name = "Item";
        if (!type) type = "Event/Command";
        console.warn(`${toTitleCase(type)} ${name} was not registered because it requires intents that are not enabled.`);
        return false;
    }
    return true;
}