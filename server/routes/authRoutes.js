import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { firstName, lastName, dob, email, password } = req.body;

    if (!firstName || !lastName || !dob || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      `INSERT INTO users (first_name, last_name, dob, email, password)
       VALUES (?, ?, ?, ?, ?)`,
      [firstName, lastName, dob, email, hashedPassword],
      function (err) {
        if (err) {
          return res.status(400).json({ error: "User already exists or invalid data." });
        }

        res.status(201).json({
          message: "User created successfully.",
          userId: this.lastID,
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
      },
    });
  });
});

export default router;