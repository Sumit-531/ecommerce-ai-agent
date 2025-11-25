// Import the 'config' function from dotenv package
import { config } from "dotenv";

// Call config() with an object to tell it WHICH .env file to load
// Example: .env.development.local or .env.production.local
config({ path: `.env.${process.env.NODE_ENV || "development"}.local` });

// Export PORT so other files can use it
// This is a shortcut for:
// export const PORT = process.env.PORT;
export const { PORT, NODE_ENV, DB_URI, GOOGLE_API_KEY } = process.env;

// Add validation
if (!GOOGLE_API_KEY) {
  console.error("GOOGLE_API_KEY is not set in environment variables");
  console.error(
    `Looking for file: .env.${process.env.NODE_ENV || "development"}.local`
  );
  process.exit(1);
}

console.log("Environment variables loaded successfully");
