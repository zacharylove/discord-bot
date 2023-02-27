import mongoose from "mongoose";
import userModel from "./models/userModel";


// Makes mongoose connection to MongoDB Atlas database
export const connectDatabase = async() => {
    console.log("Connecting to database...")
    mongoose.set("strictQuery", false);
    try {
        mongoose.connect(process.env.MONGO_URI as string, () => {
            console.log("Connection established.");
        });
    } catch (err) {
        console.error(err);
    }

    const numRecords = await userModel.countDocuments();
    console.log(`Connected to database, loaded ${numRecords} user records.`);

}