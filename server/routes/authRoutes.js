import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";
import {
  normalizeCookTimeStored,
  sanitizeCookTimeInput,
} from "../../shared/userPreferences.js";

const router = express.Router();

function safeJsonArray(value, fallback = []) {
  if (!value) return fallback;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function mapUserRowToClient(user) {
  if (!user) return null;
  return {
    id: user.id,
    firstName: user.first_name,
    lastName: user.last_name,
    dob: user.dob || "",
    email: user.email,
    preferences: {
      dietaryStyle: user.dietary_style || "",
      allergies: safeJsonArray(user.allergies),
      dislikes: safeJsonArray(user.dislikes),
      favoriteCuisines: safeJsonArray(user.favorite_cuisines),
      cookingGoal: user.cooking_goal || "",
      maxCookTime: normalizeCookTimeStored(user.max_cook_time),
      householdSize: user.household_size || 1,
    },
  };
}

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
        sanitizeCookTimeInput(maxCookTime) || "",
        "",
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
            dob,
            email,
            preferences: {
              dietaryStyle: dietaryStyle || "",
              allergies: parsedAllergies,
              dislikes: parsedDislikes,
              favoriteCuisines: parsedFavoriteCuisines,
              cookingGoal: cookingGoal || "",
              maxCookTime: sanitizeCookTimeInput(maxCookTime) || "",
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
      user: mapUserRowToClient(user),
    });
  });
});

router.get("/me", authenticateToken, (req, res) => {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(401).json({ error: "Invalid session. Please log in again." });
  }

  db.get(
    `SELECT id, first_name, last_name, dob, email, dietary_style, allergies, dislikes, favorite_cuisines, cooking_goal, max_cook_time, spice_level, household_size
     FROM users WHERE id = ?`,
    [userId],
    (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to load profile." });
      }
      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }
      res.json({ user: mapUserRowToClient(user) });
    }
  );
});

router.patch("/me", authenticateToken, (req, res) => {
  const userId = Number(req.user?.id);
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(401).json({ error: "Invalid session. Please log in again." });
  }

  db.get(`SELECT * FROM users WHERE id = ?`, [userId], (lookupErr, existing) => {
    if (lookupErr) {
      console.error(lookupErr);
      return res.status(500).json({ error: "Failed to load profile for update." });
    }
    if (!existing) {
      return res.status(404).json({ error: "User not found." });
    }

    const b = req.body || {};
    const pick = (field, fallback) => {
      const v = b[field];
      if (v === undefined || v === null) return fallback;
      if (typeof v === "string" && v.trim() === "") return fallback;
      return v;
    };

    const firstName = pick("firstName", existing.first_name);
    const lastName = pick("lastName", existing.last_name);
    const dob = pick("dob", existing.dob);
    const email = pick("email", existing.email);

    if (!firstName || !lastName || !dob || !email) {
      return res.status(400).json({
        error: "First name, last name, date of birth, and email are required.",
      });
    }

    const dietaryStyle =
      b.dietaryStyle !== undefined && b.dietaryStyle !== null
        ? String(b.dietaryStyle)
        : existing.dietary_style || "";

    const parseCommaList = (raw) =>
      raw != null && String(raw).trim() !== ""
        ? String(raw)
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];

    const parsedAllergies =
      b.allergies !== undefined
        ? parseCommaList(b.allergies)
        : safeJsonArray(existing.allergies);
    const parsedDislikes =
      b.dislikes !== undefined
        ? parseCommaList(b.dislikes)
        : safeJsonArray(existing.dislikes);
    const parsedFavoriteCuisines =
      b.favoriteCuisines !== undefined
        ? parseCommaList(b.favoriteCuisines)
        : safeJsonArray(existing.favorite_cuisines);

    const cookingGoal =
      b.cookingGoal !== undefined && b.cookingGoal !== null
        ? String(b.cookingGoal)
        : existing.cooking_goal || "";
    const maxCookTime =
      b.maxCookTime !== undefined && b.maxCookTime !== null
        ? sanitizeCookTimeInput(b.maxCookTime)
        : normalizeCookTimeStored(existing.max_cook_time);

    let household =
      b.householdSize != null && b.householdSize !== ""
        ? Number(b.householdSize)
        : existing.household_size ?? 1;
    if (Number.isNaN(household) || household < 1) {
      return res.status(400).json({ error: "Household size must be at least 1." });
    }
    household = Math.min(12, Math.floor(household));

    db.run(
      `UPDATE users SET
        first_name = ?,
        last_name = ?,
        dob = ?,
        email = ?,
        dietary_style = ?,
        allergies = ?,
        dislikes = ?,
        favorite_cuisines = ?,
        cooking_goal = ?,
        max_cook_time = ?,
        spice_level = ?,
        household_size = ?
      WHERE id = ?`,
      [
        firstName,
        lastName,
        dob,
        email,
        dietaryStyle || "",
        JSON.stringify(parsedAllergies),
        JSON.stringify(parsedDislikes),
        JSON.stringify(parsedFavoriteCuisines),
        cookingGoal || "",
        maxCookTime || "",
        "",
        household,
        userId,
      ],
      function (err) {
        if (err) {
          if (String(err.message).includes("UNIQUE")) {
            return res.status(400).json({ error: "That email is already in use." });
          }
          console.error(err);
          return res.status(500).json({ error: "Failed to update profile." });
        }
        if (this.changes === 0) {
          return res.status(404).json({ error: "User not found." });
        }

        db.get(
          `SELECT id, first_name, last_name, dob, email, dietary_style, allergies, dislikes, favorite_cuisines, cooking_goal, max_cook_time, spice_level, household_size
           FROM users WHERE id = ?`,
          [userId],
          (fetchErr, row) => {
            if (fetchErr || !row) {
              return res.status(500).json({ error: "Updated but failed to reload profile." });
            }
            const clientUser = mapUserRowToClient(row);
            const token = jwt.sign(
              { id: userId, email: clientUser.email },
              process.env.JWT_SECRET,
              { expiresIn: "7d" }
            );
            res.json({
              message: "Profile updated successfully.",
              token,
              user: clientUser,
            });
          }
        );
      }
    );
  });
});

export default router;