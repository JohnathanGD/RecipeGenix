import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./css/App.css";

function getScoreClass(overallScore) {
  const numericScore = Number(overallScore);
  if (Number.isNaN(numericScore)) return "score-badge--low";
  if (numericScore >= 8) return "score-badge--high";
  if (numericScore >= 5) return "score-badge--mid";
  return "score-badge--low";
}

export default function SavedRecipeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [recipe, setRecipe] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view saved recipes.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5050/saved-recipes/${id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error(
            "The server returned HTML instead of JSON. Restart the backend server and try again."
          );
        }
        if (cancelled) return;
        if (!res.ok) {
          throw new Error(data.error || "Could not load recipe.");
        }
        setRecipe(data);
      } catch (e) {
        if (!cancelled) setError(e.message || "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <main className="page saved-recipe-detail">
      <button
        type="button"
        className="back-link"
        onClick={() => navigate("/dashboard")}
      >
        ← Back to dashboard
      </button>

      {loading && <p className="section-text">Loading recipe…</p>}
      {error && !loading && (
        <p className="section-text" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && recipe && (
        <article className="card recipe-card saved-recipe-detail__card">
          <div className="recipe-card-item">
            <span className="recipe-tag">{recipe.culture}</span>
            <h1>{recipe.title}</h1>
            <p>{recipe.description}</p>

            {recipe.evaluation?.overallScore != null && (
              <p
                className={`score-badge ${getScoreClass(
                  recipe.evaluation.overallScore
                )}`}
              >
                Agent Score: {recipe.evaluation.overallScore}/10
              </p>
            )}

            <div className="recipe-section">
              <p>
                <strong>Prep Time:</strong> {recipe.prep_time}
              </p>
              <p>
                <strong>Cook Time:</strong> {recipe.cook_time}
              </p>
              <p>
                <strong>Servings:</strong> {recipe.servings}
              </p>
            </div>

            {recipe.evaluation?.overallScore != null && (
              <div className="recipe-section">
                <h2>Agent Evaluation</h2>
                <p>
                  <strong>Dietary Fit:</strong> {recipe.evaluation.dietaryFit}
                </p>
                <p>
                  <strong>Allergy Safety:</strong>{" "}
                  {recipe.evaluation.allergySafety}
                </p>
                <p>
                  <strong>Ingredient Fit:</strong>{" "}
                  {recipe.evaluation.ingredientFit}
                </p>
                <p>
                  <strong>Preference Fit:</strong>{" "}
                  {recipe.evaluation.preferenceFit}
                </p>
                <p>
                  <strong>Practicality:</strong>{" "}
                  {recipe.evaluation.practicality}
                </p>
                {recipe.evaluation.revisionNotes && (
                  <p>
                    <strong>Revision Notes:</strong>{" "}
                    {recipe.evaluation.revisionNotes}
                  </p>
                )}
              </div>
            )}

            <div className="recipe-section">
              <h2>Ingredients</h2>
              <ul>
                {recipe.ingredients.map((ingredient, i) => (
                  <li key={i}>{ingredient}</li>
                ))}
              </ul>
            </div>

            <div className="recipe-section">
              <h2>Instructions</h2>
              <ol>
                {recipe.instructions.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </div>
        </article>
      )}
    </main>
  );
}
