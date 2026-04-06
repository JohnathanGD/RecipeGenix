import { useState } from "react";
import "./App.css";
import Header from "./Header";

function App() {
  const [ingredients, setIngredients] = useState("");
  const [preferences, setPreferences] = useState("");
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleGenerate(e) {
    e.preventDefault();
  
    if (!ingredients.trim()) {
      alert("Please enter some ingredients first.");
      return;
    }
  
    setLoading(true);
  
    try {
      const res = await fetch("http://localhost:5000/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          preferences,
        }),
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
  
      setRecipe(data);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to generate recipe");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <main className="page">
        <section className="hero">
          <div className="hero-text">
            <span className="badge">AI-Powered Meal Creation</span>
            <h1>Build personalized recipes from what you already have.</h1>
            <p>
              RecipeGenix uses Gemini to analyze your ingredients and generate
              custom recipes based on your preferences, cuisine, and dietary
              goals.
            </p>
            <p className="subtext">
              Enter a grocery list, a few ingredients, a cuisine, or a goal like
              high protein or low carb to get started.
            </p>
          </div>
        </section>

        <section className="app-grid">
          <div className="card">
            <h2>Recipe Inputs</h2>
            <p className="section-text">
              Tell the model what ingredients you have and how you want the meal
              to turn out.
            </p>

            <form onSubmit={handleGenerate} className="form">
              <div className="input-group">
                <label>Ingredients</label>
                <textarea
                  placeholder="Example: chicken, rice, spinach, garlic, onions"
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  rows="5"
                />
              </div>

              <div className="input-group">
                <label>Preferences</label>
                <input
                  type="text"
                  placeholder="Example: high protein, low carb, Mexican"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                />
              </div>

              <button type="submit" className="generate-btn">
                {loading ? "Generating..." : "Generate Recipe"}
              </button>
            </form>
          </div>

          <div className="card recipe-card">
            {!recipe ? (
              <div className="empty-state">
                <h2>Your recipe will appear here</h2>
                <p>
                  Once you generate a recipe, the title, ingredients, and
                  instructions will show up here in a cleaner format.
                </p>
              </div>
            ) : (
              <div className="recipe">
                <span className="recipe-tag">Generated Recipe</span>
                <h2>{recipe.title}</h2>

                <div className="recipe-section">
                  <h3>Ingredients</h3>
                  <ul>
                    {recipe.ingredients.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>

                <div className="recipe-section">
                  <h3>Instructions</h3>
                  <ol>
                    {recipe.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

export default App;