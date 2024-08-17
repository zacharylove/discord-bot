import mongoose from "mongoose";
import userModel from "./models/userModel.js";
import guildModel from "./models/guildModel.js";
import { getEmoji } from "../utils/utils.js";
import { BOT } from "../index.js";
import { Emoji } from "discord.js";

// Dev use only:
// Applies changes to all entries in collection
// Useful for when we change a field
/*const updateDatabase = async () => {
    console.log("Updating guild data...");

    // Change starboard reaction and success emojis to Emoji object from string
    try {
        // Fetch all documents where emojiField is still a string
        const documents = await guildModel.find({});
    
        for (const doc of documents) {
          // Convert the string to an Emoji object using getEmoji()
    
          // Update the document with the new Emoji object
          await guildModel.updateOne(
            { _id: doc._id },
            { $set: { 
                'starboard.emoji': {name: "⭐"} as Emoji,
                'starboard.successEmoji': {name: "🌟"} as Emoji  
            },
            }
          );
        }

        console.log(`${documents.length} documents fields updated successfully.`);
      } catch (error) {
        console.error('Error updating documents:', error);
    }

}*/

// Makes mongoose connection to MongoDB Atlas database
export const connectDatabase = async() => {
    console.log("Attempting database connection...");
    let databaseOutput: string = "";
    let errorOccurred: boolean = false;
    mongoose.set("strictQuery", false);
    try {
        await mongoose.connect(process.env.MONGO_URI as string).then(() => {
            databaseOutput += "Database connection established.";
        });
    } catch (err) {
        databaseOutput += "Database connection FAILED.";
        console.error(err);
        errorOccurred = true;
    }

    try {
        const numRecords = await userModel.countDocuments();
        databaseOutput += `\n   Loaded ${numRecords} user records.`;
    } catch (err) {
        databaseOutput += "\n   Failed to load user records- make sure you've whitelisted your IP address in MongoDB Atlas!";
        console.error(err);
        errorOccurred = true;
    }
    
    console.log(databaseOutput);
    //await updateDatabase();
    if (!errorOccurred) console.log("=== DATABASE SUCCESS! ===")
    else console.log("=== DATABASE FAIL! ===")

}