// Validates environment variables to ensure they are not undefined

import { GatewayIntentBits, Partials } from "discord.js";
import { IntentOptions } from "../config/IntentOptions";
import { toTitleCase } from "./utils";
import { EventProperties } from "../interfaces/Event";

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

    // ====================
    // These environment variables are optional

    if (!process.env.GUILD_ID) {
        console.log("Missing testing guild ID! If not in development, this won't do anything.");
    } else {
        console.log("Loaded testing GUILD_ID = " + process.env.GUILD_ID);
    }

    if (!process.env.TICK_INTERVAL) {
        console.warn("Missing tick interval!");
        return false;
    } else {
        console.log("Loaded TICK_INTERVAL = " + process.env.TICK_INTERVAL);
    }

    if (!process.env.DEBUG_MODE) {
        console.warn("Missing debug mode!");
    } else if (process.env.DEBUG_MODE.toLowerCase() === "true") {
        console.log("Debug mode is enabled!");
    }

    if (!process.env.OWNER_ID) {
        console.log("No bot owner ID specified! This won't do much, just means there is no permission override for the owner.");
    } else {
        console.log("Bot owner ID loaded!");
    }
    
    if (!process.env.DEBUG_MODE || process.env.DEBUG_MODE.toLowerCase() !== "true") {
        // Disable debug logging if not in debug mode
        console.debug = () => {};
        console.log("==Debug logging disabled==");
        console.debug("If all went well, this line should NOT appear in console!");
    }
    console.log("Environment variables look OK!")
    return true;
}

/**
 * Validates whether the partial intents requested by an event or command are registered by the client
 * @param requestedPartials 
 * @param name 
 * @param type 
 */
export const validatePartials = (requestedPartials: Partials[] | undefined, name?: string, type?: string) => {
    if (!requestedPartials) return true;
    else if (!requestedPartials.every(val => Object.values(Partials).includes(val))) {
        if (!name) name = "Item";
        if (!type) type = "Event/Command";
        console.warn(`${toTitleCase(type)} ${name} was not registered because it requires disabled partial ${Partials[requestedPartials.find(val => !Object.values(Partials).includes(val))!]}.`);
        return false;
    }
    console.log("Partials check passed.");
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
        console.warn(`${toTitleCase(type)} ${name} was not registered because it requires disabled intent ${GatewayIntentBits[requestedIntents.find(val => !IntentOptions.includes(val))!]}.`);
        return false;
    }
    console.log("Intents check passed.");
    return true;
}

/**
 * Validates both intents and partials for an event or command
 * @param requestedIntents 
 * @param requestedPartials 
 * @param name 
 * @param type 
 * @returns 
 */
export const validateEventPermissions = (eventProperties: EventProperties) => {
    if (!eventProperties.Enabled) return false;
    if (!validateIntents(eventProperties.Intents, eventProperties.Name, "Event")) return false;
    if (!validatePartials(eventProperties.Partials, eventProperties.Name, "Event")) return false;
    return true;
}