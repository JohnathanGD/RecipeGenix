import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
    },
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    instructions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    prepTime: {
      type: Type.STRING,
    },
    cookTime: {
      type: Type.STRING,
    },
    servings: {
      type: Type.INTEGER,
    },
  },
  required: [
    "title",
    "ingredients",
    "instructions",
    "prepTime",
    "cookTime",
    "servings",
  ],
};

app.post("/generate-recipe", async (req, res) => {
  try {
    const { ingredients, preferences } = req.body;

    if (!ingredients?.trim()) {
      return res.status(400).json({
        error: "Ingredients are required.",
      });
    }

    const prompt = `
You are an expert recipe generator.

Create exactly one realistic recipe based on the user's available ingredients and preferences.

User ingredients:
${ingredients}

User preferences:
${preferences || "None provided"}

Rules:
- Prefer the user's listed ingredients
- You may add a few common pantry items if needed
- Keep instructions clear and practical
- Make the recipe coherent and realistic
- Return structured recipe data only
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      },
    });

    const recipe = JSON.parse(response.text);

    res.json(recipe);
  } catch (error) {
    console.error("Gemini error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate recipe",
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});