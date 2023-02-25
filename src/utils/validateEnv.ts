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
    console.log("Environment variables look OK!")
    return true;
}