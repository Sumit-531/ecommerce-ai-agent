import express from "express";
import { PORT } from "./config/env.js";
import connectToDatabase from "./database/mongodb.js";

const app = express();

app.listen(PORT, async () => {
  await connectToDatabase();
  console.log(`Server is running on port ${PORT}`);
});
