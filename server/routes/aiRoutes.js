import express from "express";
import multer from "multer";
import ai from "../config/ai.js";
import { Type } from "@google/genai";
import db from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";

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

const reviewedRecipeSchema = {
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
          evaluation: {
            type: Type.OBJECT,
            properties: {
              dietaryFit: { type: Type.STRING },
              allergySafety: { type: Type.STRING },
              ingredientFit: { type: Type.STRING },
              preferenceFit: { type: Type.STRING },
              practicality: { type: Type.STRING },
              overallScore: { type: Type.INTEGER },
              revisionNotes: { type: Type.STRING },
            },
            required: [
              "dietaryFit",
              "allergySafety",
              "ingredientFit",
              "preferenceFit",
              "practicality",
              "overallScore",
              "revisionNotes",
            ],
          },
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
          "evaluation",
        ],
      },
    },
  },
  required: ["recipes"],
};

  function getUserById(id) {
    return new Promise((resolve, reject) => {
      db.get(`SELECT * FROM users WHERE id = ?`, [id], (err, user) => {
        if (err) {
          reject(err);
        } else {
          resolve(user);
        }
      });
    });
  }

  router.post("/generate-recipe", authenticateToken, async (req, res) => {
    try {
      const { ingredients, preferences, culture, recipeCount } = req.body;
  
      const userRecord = await getUserById(req.user.id);
  
      const savedPreferences = userRecord
        ? {
            dietaryStyle: userRecord.dietary_style || "",
            allergies: userRecord.allergies ? JSON.parse(userRecord.allergies) : [],
            dislikes: userRecord.dislikes ? JSON.parse(userRecord.dislikes) : [],
            favoriteCuisines: userRecord.favorite_cuisines
              ? JSON.parse(userRecord.favorite_cuisines)
              : [],
            cookingGoal: userRecord.cooking_goal || "",
            maxCookTime: userRecord.max_cook_time || "",
            spiceLevel: userRecord.spice_level || "",
            householdSize: userRecord.household_size || 1,
          }
        : null;
  
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
        You are an expert recipe generator with access to both a saved user profile and current recipe instructions.
        
        Current recipe request:
        Ingredients: ${ingredients}
        Current request preferences: ${preferences || "None"}
        Requested culture: ${culture || "Any"}
        
        Saved user profile:
        Dietary style: ${savedPreferences?.dietaryStyle || "None"}
        Allergies: ${savedPreferences?.allergies?.join(", ") || "None"}
        Disliked ingredients: ${savedPreferences?.dislikes?.join(", ") || "None"}
        Favorite cuisines: ${savedPreferences?.favoriteCuisines?.join(", ") || "None"}
        Cooking goal: ${savedPreferences?.cookingGoal || "None"}
        Max cook time: ${savedPreferences?.maxCookTime || "None"}
        Spice level: ${savedPreferences?.spiceLevel || "None"}
        Household size: ${savedPreferences?.householdSize || 1}
        
        Relevant meal inspirations from TheMealDB:
        ${mealNames.length ? mealNames.join(", ") : "No inspirations found"}
        
        Instructions:
        - Generate exactly ${count} distinct recipe options
        - Respect allergies strictly
        - Never include disliked ingredients
        - Follow the current request preferences first when they are provided
        - Use the saved user profile as long-term guidance
        - Prefer favorite cuisines when they fit the request
        - Align recipes with the user's cooking goal when possible
        - Keep recipes within the preferred cook time when possible
        - Adjust servings to household size when reasonable
        - Not all provided ingredients must be used in every recipe
        - Use only the ingredients that make sense for each recipe
        - Prefer the user's ingredients when possible
        - You may add a few common pantry items if needed
        - Use MealDB inspirations only as style/context, not exact copies
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
  
      const parsed = JSON.parse(response.text);
  
      const reviewPrompt = `
        You are a recipe evaluation and revision agent.
        
        Your job is to review the generated recipes and improve them when needed.
        
        Current recipe request:
        Ingredients: ${ingredients}
        Current request preferences: ${preferences || "None"}
        Requested culture: ${culture || "Any"}
        
        Saved user profile:
        Dietary style: ${savedPreferences?.dietaryStyle || "None"}
        Allergies: ${savedPreferences?.allergies?.join(", ") || "None"}
        Disliked ingredients: ${savedPreferences?.dislikes?.join(", ") || "None"}
        Favorite cuisines: ${savedPreferences?.favoriteCuisines?.join(", ") || "None"}
        Cooking goal: ${savedPreferences?.cookingGoal || "None"}
        Max cook time: ${savedPreferences?.maxCookTime || "None"}
        Spice level: ${savedPreferences?.spiceLevel || "None"}
        Household size: ${savedPreferences?.householdSize || 1}
        
        MealDB inspirations:
        ${mealNames.length ? mealNames.join(", ") : "No inspirations found"}
        
        Here are the generated recipes to review:
        ${JSON.stringify(parsed.recipes, null, 2)}
        
        
        Instructions:
        - Review each recipe carefully
        - Check whether it respects dietary style
        - Check whether it avoids allergies completely
        - Check whether it avoids disliked ingredients
        - Check whether it fits the user's current request preferences
        - Check whether it makes reasonable use of the provided ingredients
        - Check whether the recipe is practical and realistic
        - If a recipe is weak, revise it so it better fits the user's constraints
        - Keep the recipes distinct from one another
        - Preserve the same number of recipes
        - Return the improved recipes
        - Add an evaluation object for each recipe
        - Scores below 7 must be revised
        - Return structured JSON only
        `;

        if (!parsed?.recipes) {
          return res.status(500).json({
            error: "Model failed to generate recipes",
          });
        }
  
      const reviewResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: reviewPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: reviewedRecipeSchema,
        },
      });
  
      const reviewedParsed = JSON.parse(reviewResponse.text);
      res.json(reviewedParsed);
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

export default router;