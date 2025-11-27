import { callAgent } from "../services/agent.js";

async function startChat(req, res) {
  // Extract user message from request body
  const initialMessage = req.body.message;
  // Generate unique thread ID using current timestamp
  const threadId = Date.now().toString();
  // Log the incoming message for debugging
  console.log(initialMessage);
  try {
    // Call our AI agent with the message and new thread ID
    const response = await callAgent(req.mongoClient, initialMessage, threadId);
    // Send successful response with thread ID and AI response
    res.json({ threadId, response });
  } catch (error) {
    // Log any errors that occur during agent execution
    console.error("Error starting conversation:", error);
    // Send error response with 500 status code
    res.status(500).json({ error: "Internal server error" });
  }
}

// Define endpoint for continuing existing conversations (POST /chat/:threadId)
async function continueChat(req, res) {
  // Extract thread ID from URL parameters
  const { threadId } = req.params;
  // Extract user message from request body
  const { message } = req.body;
  try {
    // Call AI agent with message and existing thread ID (continues conversation)
    const response = await callAgent(req.mongoClient, message, threadId);
    // Send AI response (no need to send threadId again since it's continuing)
    res.json({ response });
  } catch (error) {
    // Log any errors that occur during agent execution
    console.error("Error in chat:", error);
    // Send error response with 500 status code
    res.status(500).json({ error: "Internal server error" });
  }
}

export { startChat, continueChat };
