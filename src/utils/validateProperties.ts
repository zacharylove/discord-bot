// Validates environment variables to ensure they are not undefined

import { GatewayIntentBits, Partials } from "discord.js";
import { IntentOptions } from "../config/IntentOptions.js";
import { toTitleCase } from "./utils.js";
import { EventProperties } from "../interfaces/Event.js";
import { movie } from "../commands/slashCommands/movie.js";
import { getMovie } from "../api/tmdbAPI.js";
import { getYoutubeVideoByURL } from "../api/youtubeAPI.js";
import { toggleMusicCommands, toggleWordlecommands } from "../commands/_CommandList.js";
import { getAnime } from "../api/jikanAPI.js";
import { anime } from "../commands/slashCommands/anime.js";
import { findHardcoverBook } from "../api/googleBooksAPI.js";

export const validateEnv = async () => {
    let validationOutput: string = "Validating environment variables...";
    let valid: boolean = true;
    if (!process.env.BOT_TOKEN) {
        validationOutput += "\n  [!] FAILED: Missing Discord bot token!";
        valid = false;
    }
    if (!process.env.MONGO_URI) {
        validationOutput += "\n  [!] FAILED: Missing MongoDB Atlas connection string! Disabling Wordle";
        toggleWordlecommands(false);
        valid = false;
    }

    // ====================
    // These environment variables are optional

    if (!process.env.GUILD_ID) {
        validationOutput += "\n  ℹ️  Missing testing guild ID! If not in development, this won't do anything.";
    } else {
        validationOutput += "\n  ℹ️  Loaded testing GUILD_ID = " + process.env.GUILD_ID;
    }

    if (!process.env.TICK_INTERVAL) {
        validationOutput += "\n  ⚠️ Missing tick interval!";
        valid = false;
    } else {
        validationOutput += "\n  ℹ️  Loaded TICK_INTERVAL = " + process.env.TICK_INTERVAL;
    }

    if (!process.env.DEBUG_MODE) {
        validationOutput += "\n  ⚠️ Missing debug mode!";
    } else if (process.env.DEBUG_MODE.toLowerCase() === "true") {
        validationOutput += "\n  ℹ️  Debug mode is enabled!";
    } else if (process.env.DEBUG_MODE.toLowerCase() === "false") {
        validationOutput += "\n  ℹ️  Debug mode is disabled!";
    }

    if (!process.env.OWNER_ID) {
        validationOutput += "\n  ℹ️  No bot owner ID specified!";
    } else {
        validationOutput += "\n  ℹ️  Bot owner ID loaded!";
    }

    if (!process.env.MOVIEDB_ACCESS_TOKEN) {
        validationOutput += "\n  ❌ No TMDB API token found, disabling /movie";
        movie.properties.Enabled = false;
    }  else {
        const tmdbTestResult = await getMovie('Annihilation');
        if(tmdbTestResult == null) {
            validationOutput += "\n  ❌ TMDB API token is invalid, disabling /movie";
            movie.properties.Enabled = false;
        } else {
            validationOutput += "\n  ✅ TMDB API token is valid!";
        }
    }

    const animeTestResult = await getAnime("Monogatari");
    if(animeTestResult == null) {
        validationOutput += "\n  ❌ Jikan API token is invalid, disabling /anime";
        anime.properties.Enabled = false;
        valid = false;
    } else {
        validationOutput += "\n  ✅ Jikan API token is valid!";
    }

    if(!process.env.GOOGLE_API_KEY) {
        validationOutput += "\n  ❌ No Google API key found, disabling music";
        toggleMusicCommands(false);
        valid = false;
    } else {
        let result;
        try {
            result = getYoutubeVideoByURL("https://www.youtube.com/watch?v=9ySxxVOHW7A");
            validationOutput += "\n  ✅ Google API key is valid!";
        } catch (e) {
            validationOutput += "\n  ❌ Google API key is invalid!";
            valid = false;
        }
    }

    if(!process.env.HARDCOVER_API_KEY) {
        validationOutput += "\n  ❌ No Hardcover API key found";
    } else {
        let result;
        try {
            result = findHardcoverBook("Harry Potter and the Deathly Hallows");
            validationOutput += "\n  ✅ Hardcover API key is valid!";
        } catch (e) {
            validationOutput += "\n  ❌ Hardcover API key is invalid!";
            valid = false;
        }
    }

    if(!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) {
        validationOutput += "\n  ❌ No Spotify API key found, disabling music";
        toggleMusicCommands(false);
        valid = false;
    } else {
        validationOutput += "\n  ✅ Spotify credentials found- assuming valid until bot initialization.";
    }
    
    if (!process.env.DEBUG_MODE || process.env.DEBUG_MODE.toLowerCase() !== "true") {
        // Disable debug logging if not in debug mode
        console.debug = () => {};
        console.log("==Debug logging disabled==");
        console.debug("If all went well, this line should NOT appear in console!");
    }
    
    if (!valid) {
        validationOutput += "\n == VALIDATION FAIL! == ";
        console.log(validationOutput);
        return false;
    } else {
        validationOutput += "\n == VALIDATION SUCCESS! == ";
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