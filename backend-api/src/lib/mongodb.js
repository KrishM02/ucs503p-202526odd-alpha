import mongoose from "mongoose";

const connectToDB = async() => {
    const connectionUrl = process.env.DB_URL;
    mongoose
    .connect(connectionUrl)
    .then(() => console.log("Successfully connected to database"))
    .catch((err) => console.log(err));
}

export default connectToDB;