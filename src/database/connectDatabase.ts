import mongoose from "mongoose";
import userModel from "@models/userModel";


// Makes mongoose connection to MongoDB Atlas database
export const connectDatabase = async() => {
    let databaseOutput: string = "";
    let errorOccurred: boolean = false;
    mongoose.set("strictQuery", false);
    try {
        mongoose.connect(process.env.MONGO_URI as string).then(() => {
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
    if (!errorOccurred) console.log("=== DATABASE SUCCESS! ===")
    else console.log("=== DATABASE FAIL! ===")

}