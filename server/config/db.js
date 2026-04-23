import sqlite3 from "sqlite3";

const db = new sqlite3.Database("./recipe_app.db", (err) => {
  if (err) {
    console.error("Database connection error:", err.message);
  } else {
    console.log("Connected to SQLite database.");
  }
});

db.serialize(() => {
  db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    dob TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    dietary_style TEXT,
    allergies TEXT,
    dislikes TEXT,
    favorite_cuisines TEXT,
    cooking_goal TEXT,
    max_cook_time TEXT,
    spice_level TEXT,
    household_size INTEGER DEFAULT 1
  );
  `);

db.run(`
  CREATE TABLE IF NOT EXISTS saved_recipes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    culture TEXT,
    description TEXT,
    ingredients TEXT,
    instructions TEXT,
    prep_time TEXT,
    cook_time TEXT,
    servings INTEGER,

    overall_score REAL,
    dietary_fit TEXT,
    allergy_safety TEXT,
    ingredient_fit TEXT,
    preference_fit TEXT,
    practicality TEXT,
    revision_notes TEXT,
    user_feedback_rating TEXT,
    user_feedback_notes TEXT,

    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`);

  db.run(
    `ALTER TABLE saved_recipes ADD COLUMN user_feedback_rating TEXT`,
    (err) => {
      if (err && !String(err.message).includes("duplicate column")) {
        console.error("Migration user_feedback_rating:", err.message);
      }
    }
  );
  db.run(
    `ALTER TABLE saved_recipes ADD COLUMN user_feedback_notes TEXT`,
    (err) => {
      if (err && !String(err.message).includes("duplicate column")) {
        console.error("Migration user_feedback_notes:", err.message);
      }
    }
  );

  db.run(`
    CREATE TABLE IF NOT EXISTS grocery_lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      name TEXT DEFAULT 'My Grocery List',
      items TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
});

export default db;