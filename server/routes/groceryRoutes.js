import express from "express";
import db from "../config/db.js";
import { authenticateToken } from "../middleware/auth.js";

const router = express.Router();

router.post("/grocery-lists", authenticateToken, (req, res) => {
  const { name, items } = req.body;

  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: "Items must be an array." });
  }

  db.run(
    `INSERT INTO grocery_lists (user_id, name, items)
     VALUES (?, ?, ?)`,
    [req.user.id, name || "My Grocery List", JSON.stringify(items)],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to save grocery list." });
      }

      res.status(201).json({
        message: "Grocery list saved successfully.",
        listId: this.lastID,
      });
    }
  );
});

router.get("/grocery-lists", authenticateToken, (req, res) => {
  db.all(
    `SELECT * FROM grocery_lists WHERE user_id = ? ORDER BY id DESC`,
    [req.user.id],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch grocery lists." });
      }

      const lists = rows.map((list) => ({
        ...list,
        items: JSON.parse(list.items || "[]"),
      }));

      res.json(lists);
    }
  );
});

router.get("/grocery-lists/:id", authenticateToken, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "Invalid list id." });
  }

  db.get(
    `SELECT * FROM grocery_lists WHERE id = ? AND user_id = ?`,
    [id, req.user.id],
    (err, list) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch grocery list." });
      }

      if (!list) {
        return res.status(404).json({ error: "Grocery list not found." });
      }

      res.json({
        ...list,
        items: JSON.parse(list.items || "[]"),
      });
    }
  );
});

export default router;