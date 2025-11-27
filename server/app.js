import express from "express";
import { PORT } from "./config/env.js";
import { client, connectToDatabase } from "./database/mongodb.js";
import chatRouter from "./routes/chat.routes.js";

const app = express();

// middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Attach MongoDB client to request object
app.use((req, res, next) => {
  req.mongoClient = client;
  next();
});

// routes
app.use("/api/v1/", chatRouter);

app.listen(PORT, async () => {
  await connectToDatabase();
  console.log(`Server is running on port ${PORT}`);
});
