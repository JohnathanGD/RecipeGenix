import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import groceryRoutes from "./routes/groceryRoutes.js";
import aiRoutes from "./routes/aiRoutes.js";
import mealdbRoutes from "./routes/mealdbRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use(authRoutes);
app.use(recipeRoutes);
app.use(groceryRoutes);
app.use(aiRoutes);
app.use(mealdbRoutes);

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});