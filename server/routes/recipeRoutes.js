import express from "express";
import db from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/saved-recipes", authenticateToken, (req, res) => {
  const {
    title,
    culture,
    description,
    ingredients,
    instructions,
    prepTime,
    cookTime,
    servings,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Recipe title is required." });
  }

  db.run(
    `INSERT INTO saved_recipes
    (user_id, title, culture, description, ingredients, instructions, prep_time, cook_time, servings)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      req.user.id,
      title,
      culture || "",
      description || "",
      JSON.stringify(ingredients || []),
      JSON.stringify(instructions || []),
      prepTime || "",
      cookTime || "",
      servings || null,
    ],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to save recipe." });
      }

      res.status(201).json({
        message: "Recipe saved successfully.",
        recipeId: this.lastID,
      });
    }
  );
});

router.get("/saved-recipes", authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM saved_recipes WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch saved recipes." });
      }

      const recipes = rows.map((recipe) => ({
        ...recipe,
        ingredients: JSON.parse(recipe.ingredients || "[]"),
        instructions: JSON.parse(recipe.instructions || "[]"),
      }));

      res.json(recipes);
    }
  );
});

export default router;