import express from "express";

const router = express.Router();

router.get("/mealdb/areas", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.themealdb.com/api/json/v1/1/list.php?a=list"
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("MealDB areas error:", error);
    res.status(500).json({ error: "Failed to fetch MealDB areas" });
  }
});

router.get("/mealdb/ingredients", async (req, res) => {
  try {
    const response = await fetch(
      "https://www.themealdb.com/api/json/v1/1/list.php?i=list"
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("MealDB ingredients error:", error);
    res.status(500).json({ error: "Failed to fetch MealDB ingredients" });
  }
});

router.get("/mealdb/by-area", async (req, res) => {
  try {
    const { area } = req.query;

    if (!area) {
      return res.status(400).json({ error: "Area is required" });
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?a=${encodeURIComponent(area)}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("MealDB by-area error:", error);
    res.status(500).json({ error: "Failed to fetch meals by area" });
  }
});

router.get("/mealdb/by-ingredient", async (req, res) => {
  try {
    const { ingredient } = req.query;

    if (!ingredient) {
      return res.status(400).json({ error: "Ingredient is required" });
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/filter.php?i=${encodeURIComponent(ingredient)}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("MealDB by-ingredient error:", error);
    res.status(500).json({ error: "Failed to fetch meals by ingredient" });
  }
});

router.get("/mealdb/lookup", async (req, res) => {
  try {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Meal id is required" });
    }

    const response = await fetch(
      `https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(id)}`
    );
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("MealDB lookup error:", error);
    res.status(500).json({ error: "Failed to fetch meal details" });
  }
});

router.post("/mealdb/inspiration", async (req, res) => {
  try {
    const { ingredients, culture } = req.body;

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

    res.json({
      source: "MealDB",
      primaryIngredient: firstIngredient || null,
      culture: culture || null,
      meals: mealdbResults.slice(0, 10),
    });
  } catch (error) {
    console.error("MealDB inspiration error:", error);
    res.status(500).json({ error: "Failed to fetch MealDB inspiration" });
  }
});

export default router;