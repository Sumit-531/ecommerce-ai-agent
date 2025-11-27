import { HumanMessage } from "@langchain/core/messages";
import {
  ChatPromptTemplate, // For creating structured prompts with placeholders
  MessagesPlaceholder, // Placeholder for dynamic message history
} from "@langchain/core/prompts";
// State-based workflow orchestration
import { StateGraph } from "@langchain/langgraph";
import { Annotation } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { MongoDBSaver } from "@langchain/langgraph-checkpoint-mongodb";
import { itemLookupTool } from "../tools/itemLookup.tool.js";
import googleLLM from "./llm/google.llm.js";
import { retryWithBackoff } from "../utils/retry.js";

// Main function that creates and runs the AI agent
export async function callAgent(client, query, thread_id) {
  try {
    // Database configuration
    const dbName = "inventory_database";
    const db = client.db(dbName);
    const collection = db.collection("items");

    // Define the state structure for the agent workflow
    const GraphState = Annotation.Root({
      messages: Annotation({
        // Reducer function: how to combine old and new messages
        reducer: (x, y) => x.concat(y), // Simply concatenate old messages (x) with new messages (y)
      }),
    });

    // Array of all available tools
    const tools = [itemLookupTool(collection)];
    // Create a tool execution node for the workflow
    const toolNode = new ToolNode(tools);

    // Bind tools to the model
    const model = googleLLM.bindTools(tools);

    // Decision function: determines next step in the workflow
    function shouldContinue(state) {
      // Get all messages
      const messages = state.messages;
      // Get the most recent message
      const lastMessage = messages[messages.length - 1];

      // If the AI wants to use tools, go to tools node; otherwise end
      if (lastMessage.tool_calls?.length) {
        return "tools"; // Route to tool execution
      }
      return "__end__"; // End the workflow
    }

    // Function that calls the AI model with retry logic
    async function callModel(state) {
      return retryWithBackoff(async () => {
        // Create a structured prompt template
        const prompt = ChatPromptTemplate.fromMessages([
          [
            "system", // System message defines the AI's role and behavior
            `You are a helpful E-commerce Chatbot Agent for a home decor store. 

              IMPORTANT: You have access to an item_lookup tool that searches the home decor inventory database.
              ALWAYS use this tool when customers ask about home decor items, even if the tool returns errors or empty results.
              NEVER make up or assume product information - only share what the tool returns.

            When responding to customers:
            - If you find matching products, present them naturally with details like name, price, features, and reviews
            - If the search returns no matching items, politely tell them "We don't currently have that item in stock" and suggest alternatives
            - ONLY say there's a problem with inventory if the tool returns an actual error message (not just empty results)
            - NEVER mention "tools", "item_lookup", "database queries", "error messages", or any technical implementation details to the customer
            - Be professional, friendly, and focus on helping them find the perfect home decor item

            Current time: {time}`,
          ],
          new MessagesPlaceholder("messages"), // Placeholder for conversation history
        ]);

        // Fill in the prompt template with actual values
        const formattedPrompt = await prompt.formatMessages({
          time: new Date().toISOString(), // Current timestamp
          messages: state.messages, // All previous messages
        });

        // Call the AI model with the formatted prompt
        const result = await model.invoke(formattedPrompt);
        // Return new state with the AI's response added
        return { messages: [result] };
      });
    }

    // Build the workflow graph
    const workflow = new StateGraph(GraphState)
      .addNode("agent", callModel) // Add AI model node
      .addNode("tools", toolNode) // Add tool execution node
      .addEdge("__start__", "agent") // Start workflow at agent
      .addConditionalEdges("agent", shouldContinue) // Agent decides: tools or end
      .addEdge("tools", "agent"); // After tools, go back to agent

    // Initialize conversation state persistence
    const checkpointer = new MongoDBSaver({ client, dbName });
    // Compile the workflow with state saving
    const app = workflow.compile({ checkpointer });

    // Execute the workflow
    const finalState = await app.invoke(
      {
        messages: [new HumanMessage(query)], // Start with user's question
      },
      {
        recursionLimit: 15, // Prevent infinite loops
        configurable: { thread_id: thread_id }, // Conversation thread identifier
      }
    );

    // Extract the final response from the conversation
    const response =
      finalState.messages[finalState.messages.length - 1].content;
    console.log("Agent response:", response);

    return response; // Return the AI's final response
  } catch (error) {
    // Handle different types of errors with user-friendly messages
    console.error("Error in callAgent:", error.message);

    if (error.status === 429) {
      // Rate limit error
      throw new Error(
        "Service temporarily unavailable due to rate limits. Please try again in a minute."
      );
    } else if (error.status === 401) {
      // Authentication error
      throw new Error(
        "Authentication failed. Please check your API configuration."
      );
    } else {
      // Generic error
      throw new Error(`Agent failed: ${error.message}`);
    }
  }
}
