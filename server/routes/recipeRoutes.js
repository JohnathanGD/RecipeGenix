import express from "express";
import db from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

function mapSavedRecipe(recipe) {
  if (!recipe) return null;
  const r = recipe.user_feedback_rating;
  const rating = r === "up" || r === "down" ? r : null;
  return {
    ...recipe,
    ingredients: JSON.parse(recipe.ingredients || "[]"),
    instructions: JSON.parse(recipe.instructions || "[]"),
    evaluation: {
      overallScore: recipe.overall_score,
      dietaryFit: recipe.dietary_fit,
      allergySafety: recipe.allergy_safety,
      ingredientFit: recipe.ingredient_fit,
      preferenceFit: recipe.preference_fit,
      practicality: recipe.practicality,
      revisionNotes: recipe.revision_notes,
    },
    userFeedback: {
      rating,
      notes: recipe.user_feedback_notes || "",
    },
  };
}

router.post("/saved-recipes", authenticateToken, (req, res) => {
  const userId = req.user.id;

  const {
    title,
    culture,
    description,
    ingredients,
    instructions,
    prepTime,
    cookTime,
    servings,
    evaluation,
  } = req.body;

  if (!title) {
    return res.status(400).json({ error: "Recipe title is required." });
  }

  const sql = `
    INSERT INTO saved_recipes (
      user_id,
      title,
      culture,
      description,
      ingredients,
      instructions,
      prep_time,
      cook_time,
      servings,
      overall_score,
      dietary_fit,
      allergy_safety,
      ingredient_fit,
      preference_fit,
      practicality,
      revision_notes
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    userId,
    title,
    culture || "",
    description || "",
    JSON.stringify(ingredients || []),
    JSON.stringify(instructions || []),
    prepTime || "",
    cookTime || "",
    servings || null,
    evaluation?.overallScore ?? null,
    evaluation?.dietaryFit ?? null,
    evaluation?.allergySafety ?? null,
    evaluation?.ingredientFit ?? null,
    evaluation?.preferenceFit ?? null,
    evaluation?.practicality ?? null,
    evaluation?.revisionNotes ?? null,
  ];

  db.run(sql, values, function (err) {
    if (err) {
      console.error("Error saving recipe:", err.message);
      return res.status(500).json({ error: "Failed to save recipe." });
    }

    res.status(201).json({
      message: "Recipe saved successfully.",
      recipeId: this.lastID,
    });
  });
});

router.get("/saved-recipes", authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM saved_recipes WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        console.error("Error fetching saved recipes:", err.message);
        return res.status(500).json({ error: "Failed to fetch saved recipes." });
      }

      const recipes = rows.map((row) => mapSavedRecipe(row));

      res.json(recipes);
    }
  );
});

router.get("/saved-recipes/:id", authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid recipe id." });
  }

  db.get(
    `SELECT * FROM saved_recipes WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    (err, recipe) => {
      if (err) {
        console.error("Error fetching saved recipe:", err.message);
        return res.status(500).json({ error: "Failed to fetch recipe." });
      }

      if (!recipe) {
        return res.status(404).json({ error: "Recipe not found." });
      }

      res.json(mapSavedRecipe(recipe));
    }
  );
});

router.patch("/saved-recipes/:id", authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid recipe id." });
  }

  const { userFeedback } = req.body;
  if (!userFeedback || typeof userFeedback !== "object") {
    return res.status(400).json({ error: "userFeedback is required." });
  }

  let rating = null;
  if (userFeedback.rating === "up" || userFeedback.rating === "down") {
    rating = userFeedback.rating;
  } else if (
    userFeedback.rating !== null &&
    userFeedback.rating !== undefined &&
    userFeedback.rating !== ""
  ) {
    return res.status(400).json({
      error: "rating must be 'up', 'down', or null.",
    });
  }

  const notes =
    typeof userFeedback.notes === "string" ? userFeedback.notes : "";

  db.run(
    `UPDATE saved_recipes SET user_feedback_rating = ?, user_feedback_notes = ? WHERE id = ? AND user_id = ?`,
    [rating, notes, id, req.user.id],
    function (err) {
      if (err) {
        console.error("Error updating recipe feedback:", err.message);
        return res.status(500).json({ error: "Failed to save feedback." });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: "Recipe not found." });
      }

      db.get(
        `SELECT * FROM saved_recipes WHERE id = ? AND user_id = ?`,
        [id, req.user.id],
        (err2, row) => {
          if (err2 || !row) {
            return res
              .status(500)
              .json({ error: "Failed to load updated recipe." });
          }
          res.json(mapSavedRecipe(row));
        }
      );
    }
  );
});

export default router;