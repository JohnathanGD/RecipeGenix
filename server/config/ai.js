import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config(); // CRITICAL — load env here

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is missing");
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export default ai;