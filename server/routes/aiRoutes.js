import express from "express";
import multer from "multer";
import ai from "../config/ai.js";
import { Type } from "@google/genai";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const extractedIngredientsSchema = {
  type: Type.OBJECT,
  properties: {
    ingredients: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
  },
  required: ["ingredients"],
};

const recipeSchema = {
  type: Type.OBJECT,
  properties: {
    recipes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          culture: { type: Type.STRING },
          description: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          instructions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          prepTime: { type: Type.STRING },
          cookTime: { type: Type.STRING },
          servings: { type: Type.INTEGER },
        },
        required: [
          "title",
          "culture",
          "description",
          "ingredients",
          "instructions",
          "prepTime",
          "cookTime",
          "servings",
        ],
      },
    },
  },
  required: ["recipes"],
};

router.post("/generate-recipe", async (req, res) => {
  try {
    const { ingredients, preferences, culture, recipeCount } = req.body;

    if (!ingredients?.trim()) {
      return res.status(400).json({
        error: "Ingredients are required.",
      });
    }

    const count = Math.min(Math.max(Number(recipeCount) || 10, 1), 10);

    const firstIngredient = ingredients
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean)[0];

    let mealdbResults = [];

    if (culture) {
      const areaRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(culture)}`
      );
      const areaData = await areaRes.json();
      mealdbResults = areaData.meals || [];
    } else if (firstIngredient) {
      const ingredientRes = await fetch(
        `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(firstIngredient)}`
      );
      const ingredientData = await ingredientRes.json();
      mealdbResults = ingredientData.meals || [];
    }

    const mealNames = mealdbResults
      .slice(0, 10)
      .map((meal) => meal.strMeal)
      .filter(Boolean);

    const prompt = `
      You are an expert recipe generator.

      The user wants recipes based on:
      Ingredients: ${ingredients}
      Preferences: ${preferences || "None"}
      Culture: ${culture || "Any"}
      
      Important:
      - Not all provided ingredients must be used in every recipe
      - Use only the ingredients that make sense for each recipe
      - It is okay to leave out ingredients that do not fit well
      - Prefer the user's ingredients when possible
      - You may add a few common pantry items if needed
      
      Here are relevant meal inspirations from TheMealDB:
      ${mealNames.length ? mealNames.join(", ") : "No inspirations found"}
      
      Generate exactly ${count} distinct recipe options.
      Make the recipes practical, realistic, and meaningfully different from one another.
      Use the MealDB inspirations only as style/context, not as exact copies.
      Return structured recipe data only.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: recipeSchema,
      },
    });

    const parsed = JSON.parse(response.text);
    res.json(parsed);
  } catch (error) {
    console.error("Hybrid generation error:", error);
    res.status(500).json({
      error: error?.message || "Failed to generate recipes",
    });
  }
});

router.post("/extract-ingredients", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const mimeType = req.file.mimetype;
    const base64Data = req.file.buffer.toString("base64");

    const prompt = `
Extract grocery or ingredient items from this uploaded file.

Rules:
- Return only ingredient or grocery item names
- Remove duplicates
- Keep names concise and normalized
- Remove any item on the list that is non-edible
- Ignore headers, notes, prices, and non-food text when possible
- Return structured JSON only
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: extractedIngredientsSchema,
      },
    });

    const parsed = JSON.parse(response.text);
    res.json(parsed);
  } catch (error) {
    console.error("Ingredient extraction error:", error);
    res.status(500).json({
      error: error?.message || "Failed to extract ingredients",
    });
  }
});

router.get("/health", (req, res) => {
  res.json({ ok: true });
});

export default router;