import { tool } from "@langchain/core/tools";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { z } from "zod";
import googleEmbedding from "../services/embedding/google.embedding.js";

// Create a custom tool for searching inventory
export const itemLookupTool = (collection) =>
  tool(
    async ({ query, n = 10 }) => {
      try {
        console.log("Item lookup tool called with query: ", query);

        // Check if database has any data at all
        const totalCount = await collection.countDocuments();
        console.log("Total documents in collection: ", totalCount);

        // Early return if database is empty
        if (totalCount === 0) {
          console.log("Collection is empty");
          return JSON.stringify({
            error: "No items found in inventory",
            message: "The inventory database appears to be empty",
            count: 0,
          });
        }

        // Get sample documents for debugging purposes
        const sampleDocs = await collection.find({}).limit(3).toArray();
        console.log("Sample documents: ", sampleDocs);

        // Configuration for MongoDB Atlas Vector Search
        const dbConfig = {
          collection: collection, // MongoDB collection to search
          indexName: "vector_index", // Name of the vector search index
          textKey: "embedding_text", // Field containing the text used for embeddings
          embeddingKey: "embedding", // Field containing the vector embeddings
        };

        // Create vector store instance for semantic search using Google Gemini embeddings
        const vectorStore = new MongoDBAtlasVectorSearch(
          googleEmbedding,
          dbConfig
        );

        console.log("Performing vector search...");

        // Perform semantic search using vector embeddings
        const result = await vectorStore.similaritySearchWithScore(query, n);
        console.log(`Vector search returned ${result.length} results`);

        // If vector search returns no results, fall back to text search
        if (result.length === 0) {
          console.log(
            "Vector search returned no results, trying text search..."
          );
          // MongoDB text search using regular expressions
          const textResults = await collection
            .find({
              $or: [
                // OR condition - match any of these fields
                { item_name: { $regex: query, $options: "i" } }, // Case-insensitive search in item name
                { item_description: { $regex: query, $options: "i" } }, // Case-insensitive search in description
                { categories: { $regex: query, $options: "i" } }, // Case-insensitive search in categories
                { embedding_text: { $regex: query, $options: "i" } }, // Case-insensitive search in embedding text
              ],
            })
            .limit(n)
            .toArray(); // Limit results and convert to array

          console.log(`Text search returned ${textResults.length} results`);
          // Return text search results as JSON string
          return JSON.stringify({
            results: textResults,
            searchType: "text", // Indicate this was a text search
            query: query,
            count: textResults.length,
          });
        }

        // Return vector search results as JSON string
        return JSON.stringify({
          results: result,
          searchType: "vector", // Indicate this was a vector search
          query: query,
          count: result.length,
        });
      } catch (error) {
        console.error("Error in item lookup: ", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name,
        });

        // Return error information as JSON string
        return JSON.stringify({
          error: "Failed to search inventory",
          details: error.message,
          query: query,
        });
      }
    },

    // Tool metadata and schema definition
    {
      name: "item_lookup",
      description: "Gathers furniture item details from the Inventory database",
      schema: z.object({
        query: z.string().describe("The search query"),
        n: z
          .number()
          .optional()
          .default(10) // Optional number parameter with default
          .describe("Number of results to return"),
      }),
    }
  );
