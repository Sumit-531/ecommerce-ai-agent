import { itemSchema } from "../models/item.model.js";
import googleLLM from "../services/llm/google.llm.js";
import googleEmbedding from "../services/embedding/google.embedding.js";
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import connectToDatabase from "../database/mongodb.js";
import { MongoClient } from "mongodb";
import { DB_URI } from "../config/env.js";

// Create MongoDB client
const client = new MongoClient(DB_URI);

// Create parser that ensures AI output matches our item schema
const parser = StructuredOutputParser.fromZodSchema(z.array(itemSchema));

// Function to create vector search index
async function createVectorSearchIndex(collection) {
  try {
    await collection.dropIndexes();
    const vectorSearchIdx = {
      name: "vector_index",
      type: "vectorSearch",
      definition: {
        fields: [
          {
            type: "vector",
            path: "embedding",
            numDimensions: 768,
            similarity: "cosine",
          },
        ],
      },
    };

    console.log("Creating vector search index...");
    await collection.createSearchIndex(vectorSearchIdx);

    console.log("Successfully created vector search index");
  } catch (error) {
    console.error("Failed to create vector search index: ", error);
  }
}

async function generateSyntheticData() {
  try {
    const prompt = `You are a helpful assistant that generates furniture store item data. 
    Generate 15 furniture store items. Each record should include the following fields: 
    item_id, item_name, item_description, brand, manufacturer_address, prices, categories, user_reviews, notes. 
    Ensure variety in the data and realistic values.
    
    ${parser.getFormatInstructions()}`; // Add format instructions from parser

    console.log("Generating synthetic data...");

    // Send prompt to AI and get response
    const response = await googleLLM.invoke(prompt);
    // Parse AI response into structured array of Item objects
    return parser.parse(response.content);
  } catch (error) {
    console.error("Error generating data: ", error);
  }
}

function createItemSummary(item) {
  const manufacturerDetails = `Made in ${item.manufacturer_address.country}`;
  const categories = item.categories.join(", ");
  const userReviews = item.user_reviews
    .map(
      (review) =>
        `Rated ${review.rating} on ${review.review_date}: ${review.comment}`
    )
    .join(" "); // Join multiple reviews with spaces

  const basicInfo = `${item.item_name} ${item.item_description} from the brand ${item.brand}`;
  const price = `At full price it costs: ${item.prices.full_price} USD, On sale it costs: ${item.prices.sale_price} USD`;
  // Get additional notes
  const notes = item.notes;

  // Combine all information into comprehensive summary for vector search
  return `${basicInfo}. Manufacturer: ${manufacturerDetails}. Categories: ${categories}. Reviews: ${userReviews}. Price: ${price}. Notes: ${notes}`;
}

async function seedDatabase() {
  try {
    await connectToDatabase();

    // Get database and collection
    const db = client.db("inventory_database");
    const collection = db.collection("items");

    // Clear existing data from collection
    await collection.deleteMany({});
    console.log("Cleared existing data from items collection");

    // Generate synthetic data
    const syntheticData = await generateSyntheticData();

    // Add summaries & store embeddings
    const recordsWithSummaries = syntheticData.map((item) => ({
      pageContent: createItemSummary(item),
      metadata: { ...item },
    }));

    // Store each record with vector embeddings in MongoDB
    for (const record of recordsWithSummaries) {
      await MongoDBAtlasVectorSearch.fromDocuments([record], googleEmbedding, {
        collection,
        indexName: "vector_index",
        textKey: "embedding_text",
        embeddingKey: "embedding",
      });
      console.log("Saved record:", record.metadata.item_id);
    }

    // Create vector index
    await createVectorSearchIndex(collection);

    console.log("Database seeding completed!");
  } catch (error) {
    console.log("Error seeding database: ", error);
  } finally {
    // Always close database connection when finished (cleanup)
    await client.close();
  }
}

// Run seeding
seedDatabase().catch(console.error);
