import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { GOOGLE_API_KEY } from "../../config/env.js";

const googleLLM = new ChatGoogleGenerativeAI({
  model: "gemini-2.0-flash",
  // Creativity level -> 0.7 -> Moderatly creative
  temperature: 0.7,
  apiKey: GOOGLE_API_KEY,
});

export default googleLLM;
