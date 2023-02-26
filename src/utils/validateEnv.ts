// Validates environment variables to ensure they are not undefined

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
    } else {
        if (process.env.DEBUG_MODE.toLowerCase() === "true") {
            console.log("Debug mode is enabled!");
        }
    }
    console.log("Environment variables look OK!")
    return true;
}