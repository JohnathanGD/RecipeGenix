import { useState } from "react";
import "./App.css";

function App() {
  const [ingredients, setIngredients] = useState("");
  const [preferences, setPreferences] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e) {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setRecipe({
        title: "High Protein Chicken Bowl",
        ingredients: [
          "Chicken breast",
          "Brown rice",
          "Spinach",
          "Garlic",
        ],
        instructions: [
          "Cook chicken until fully done",
          "Prepare rice",
          "Sauté spinach with garlic",
          "Combine everything into bowl",
        ],
      });
      setLoading(false);
    }, 800);
  }

  return (
    <div className="container">
      <h1>AI Recipe Generator</h1>

      <form onSubmit={handleGenerate} className="form">
        <input
          type="text"
          placeholder="Ingredients (chicken, rice...)"
          value={ingredients}
          onChange={(e) => setIngredients(e.target.value)}
        />

        <input
          type="text"
          placeholder="Preferences (high protein, vegetarian...)"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
        />

        <button type="submit">
          {loading ? "Generating..." : "Generate Recipe"}
        </button>
      </form>

      {recipe && (
        <div className="recipe">
          <h2>{recipe.title}</h2>

          <h3>Ingredients</h3>
          <ul>
            {recipe.ingredients.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>

          <h3>Instructions</h3>
          <ol>
            {recipe.instructions.map((step, i) => (
              <li key={i}>{step}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

export default App;
