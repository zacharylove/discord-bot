// Validates environment variables to ensure they are not undefined

import { GatewayIntentBits, Partials } from "discord.js";
import { IntentOptions } from "../config/IntentOptions.js";
import { toTitleCase } from "./utils.js";
import { EventProperties } from "../interfaces/Event.js";
import { movie } from "../commands/slashCommands/movie.js";
import { getMovie } from "../api/tmdbAPI.js";

export const validateEnv = async () => {
    let validationOutput: string = "Validating environment variables...";
    let valid: boolean = true;
    if (!process.env.BOT_TOKEN) {
        validationOutput += "\n  [!] FAILED: Missing Discord bot token!";
        valid = false;
    }
    if (!process.env.MONGO_URI) {
        validationOutput += "\n  [!] FAILED: Missing MongoDB Atlas connection string!";
        valid = false;
    }

    // ====================
    // These environment variables are optional

    if (!process.env.GUILD_ID) {
        validationOutput += "\n  [?] Missing testing guild ID! If not in development, this won't do anything.";
    } else {
        validationOutput += "\n  [~] Loaded testing GUILD_ID = " + process.env.GUILD_ID;
    }

    if (!process.env.TICK_INTERVAL) {
        validationOutput += "\n  [!] FAILED: Missing tick interval!";
        valid = false;
    } else {
        validationOutput += "\n  [~] Loaded TICK_INTERVAL = " + process.env.TICK_INTERVAL;
    }

    if (!process.env.DEBUG_MODE) {
        validationOutput += "\n  [?] WARN: Missing debug mode!";
    } else if (process.env.DEBUG_MODE.toLowerCase() === "true") {
        validationOutput += "\n  [~] Debug mode is enabled!";
    } else if (process.env.DEBUG_MODE.toLowerCase() === "false") {
        validationOutput += "\n  [~] Debug mode is disabled!";
    }

    if (!process.env.OWNER_ID) {
        validationOutput += "\n  [?] No bot owner ID specified!";
    } else {
        validationOutput += "\n  [~] Bot owner ID loaded!";
    }


    const tmdbTestResult = await getMovie('Annihilation');
    if (!process.env.MOVIEDB_ACCESS_TOKEN) {
        validationOutput += "\n  [!] No TMDB API token found, disabling /movie";
        movie.properties.Enabled = false;
    } else if(tmdbTestResult == null) {
        validationOutput += "\n  [!] TMDB API token is invalid, disabling /movie";
        movie.properties.Enabled = false;
    } else {
        validationOutput += "\n  [~] TMDB API token is valid!";
    }
    
    if (!process.env.DEBUG_MODE || process.env.DEBUG_MODE.toLowerCase() !== "true") {
        // Disable debug logging if not in debug mode
        console.debug = () => {};
        console.log("==Debug logging disabled==");
        console.debug("If all went well, this line should NOT appear in console!");
    }
    
    if (!valid) {
        validationOutput += "\n ==VALIDATION FAIL!== ";
        console.log(validationOutput);
        return false;
    } else {
        validationOutput += "\n ==VALIDATION SUCCESS!== ";
        console.log(validationOutput);
        return true;
    }
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