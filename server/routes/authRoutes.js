import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      dob,
      email,
      password,
      dietaryStyle,
      allergies,
      dislikes,
      favoriteCuisines,
      cookingGoal,
      maxCookTime,
      spiceLevel,
      householdSize,
    } = req.body;

    if (!firstName || !lastName || !dob || !email || !password) {
      return res.status(400).json({ error: "All required fields must be filled." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const parsedAllergies = allergies
      ? allergies.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

    const parsedDislikes = dislikes
      ? dislikes.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

    const parsedFavoriteCuisines = favoriteCuisines
      ? favoriteCuisines.split(",").map((item) => item.trim()).filter(Boolean)
      : [];

    db.run(
      `INSERT INTO users (
        first_name,
        last_name,
        dob,
        email,
        password,
        dietary_style,
        allergies,
        dislikes,
        favorite_cuisines,
        cooking_goal,
        max_cook_time,
        spice_level,
        household_size
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        firstName,
        lastName,
        dob,
        email,
        hashedPassword,
        dietaryStyle || "",
        JSON.stringify(parsedAllergies),
        JSON.stringify(parsedDislikes),
        JSON.stringify(parsedFavoriteCuisines),
        cookingGoal || "",
        maxCookTime || "",
        spiceLevel || "",
        householdSize || 1,
      ],
      function (err) {
        if (err) {
          return res.status(400).json({
            error: "User already exists or invalid data.",
          });
        }

        const token = jwt.sign(
          { id: this.lastID, email },
          process.env.JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.status(201).json({
          message: "User created successfully.",
          token,
          user: {
            id: this.lastID,
            firstName,
            lastName,
            email,
            preferences: {
              dietaryStyle: dietaryStyle || "",
              allergies: parsedAllergies,
              dislikes: parsedDislikes,
              favoriteCuisines: parsedFavoriteCuisines,
              cookingGoal: cookingGoal || "",
              maxCookTime: maxCookTime || "",
              spiceLevel: spiceLevel || "",
              householdSize: householdSize || 1,
            },
          },
        });
      }
    );
  } catch {
    res.status(500).json({ error: "Failed to sign up." });
  }
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: "Server error." });
    }

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(400).json({ error: "Invalid email or password." });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        preferences: {
          dietaryStyle: user.dietary_style || "",
          allergies: user.allergies ? JSON.parse(user.allergies) : [],
          dislikes: user.dislikes ? JSON.parse(user.dislikes) : [],
          favoriteCuisines: user.favorite_cuisines
            ? JSON.parse(user.favorite_cuisines)
            : [],
          cookingGoal: user.cooking_goal || "",
          maxCookTime: user.max_cook_time || "",
          spiceLevel: user.spice_level || "",
          householdSize: user.household_size || 1,
        },
      },
    });
  });
});

export default router;