import { connect } from 'mongoose';

// Makes mongoose connection to MongoDB Atlas database
export const connectDatabase = async() => {
    await connect(process.env.MONGO_URI as string);

    console.log("Connected to database!")
}