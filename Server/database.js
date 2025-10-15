import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();


async function connectToDB() {
    const connectionString = process.env.DB_URL;
    mongoose.connect(connectionString)
    .then(() => console.log("Connected to MongoDB"))
    .catch((err) => console.error("Error connecting to MongoDB: ",err));
}

export default connectToDB;