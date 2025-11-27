import { Router } from "express";
import { startChat, continueChat } from "../controllers/chat.controller.js";

const chatRouter = Router();

// Define endpoint for starting new conversations (POST /chat)
chatRouter.post("/", startChat);

// Define endpoint for continuing existing conversations (POST /chat/:threadId)
chatRouter.post("/:threadId", continueChat);

export default chatRouter;
