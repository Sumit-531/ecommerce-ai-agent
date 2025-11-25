import { MongoClient } from "mongodb";
import { DB_URI, NODE_ENV } from "../config/env.js";

if (!DB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.<development/production>.local"
  );
}

const client = new MongoClient(DB_URI);

const connectToDatabase = async () => {
  try {
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      `MongoDB deployment is pinged. Connected to database in ${NODE_ENV} mode.`
    );
  } catch (error) {
    console.error("Error connecting to database: ", error);

    process.exit(1);
  }
};

export default connectToDatabase;
