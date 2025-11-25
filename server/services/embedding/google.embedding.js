import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { GOOGLE_API_KEY } from "../../config/env.js";

const googleEmbedding = new GoogleGenerativeAIEmbeddings({
  model: "text-embedding-004",
  apiKey: GOOGLE_API_KEY,
});

export default googleEmbedding;
