import { useState, useEffect, useRef} from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./css/App.css";
import About from './about';
import Header from "./components/Header";
import Login from "./login";
import Signup from "./signup";

function MainPage() {
  const [ingredients, setIngredients] = useState("");
  const [preferences, setPreferences] = useState("");
  const [recipesData, setRecipesData] = useState(null);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [culture, setCulture] = useState("");
  const [recipeCount, setRecipeCount] = useState(10);
  const [areas, setAreas] = useState([]);
  const fileInputRef = useRef(null);

  const handleClick = () => {
    fileInputRef.current.click();
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
  
    console.log("Selected file:", file);
  
    const formData = new FormData();
    formData.append("file", file);
  
    try {
      const res = await fetch("http://localhost:5050/extract-ingredients", {
        method: "POST",
        body: formData,
      });
  
      const data = await res.json();
  
      if (!res.ok) {
        throw new Error(data.error || "Failed to extract ingredients");
      }
  
      if (Array.isArray(data.ingredients)) {
        setIngredients(data.ingredients.join(", "));
      }
    } catch (error) {
      console.error(error);
      alert("Failed to process file");
    }
  };

  async function handleGenerate(e) {
    e.preventDefault();

    if (!ingredients.trim()) {
      alert("Please enter some ingredients first.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("http://localhost:5050/generate-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ingredients,
          preferences,
          culture,
          recipeCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setRecipesData(data);
      setCurrentRecipeIndex(0);
      setShowDetails(false);

    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to generate recipe");
    } finally {
      setLoading(false);
    }
  }

  const handleNextRecipe = () => {
    if (!recipesData?.recipes?.length) return;
    setCurrentRecipeIndex((prev) =>
      prev === recipesData.recipes.length - 1 ? 0 : prev + 1
    );
    setShowDetails(false);
  };
  
  const handlePrevRecipe = () => {
    if (!recipesData?.recipes?.length) return;
    setCurrentRecipeIndex((prev) =>
      prev === 0 ? recipesData.recipes.length - 1 : prev - 1
    );
    setShowDetails(false);
  };

  useEffect(() => {
    async function fetchAreas() {
      try {
        const res = await fetch("http://localhost:5050/mealdb/areas");
        const data = await res.json();
        setAreas(data.meals || []);
      } catch (error) {
        console.error("Failed to load MealDB areas:", error);
      }
    }
  
    fetchAreas();
  }, []);

  return (
    <>

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

            <p className="section-text">If you have a grocery list please upload it here. Acceptable files include .pdf and .txt</p>

          <div>
            <button onClick={handleClick} className="generate-btn">Upload File</button>
            <input
            type='file'
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{display: 'none'}} 
            />
          </div>

          <p className="section-text">If you don't, please proceed filling out ingredients you would like to use in your reciepes.</p>

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
                  placeholder="Example: high protein, low carb, spicy"
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                />
              </div>

              <div className="input-group">
                <label>Culture / Cuisine</label>
                <select
                  value={culture}
                  onChange={(e) => setCulture(e.target.value)}
                >
                  <option value="">Any</option>
                  {areas.map((areaObj, index) => (
                    <option key={index} value={areaObj.strArea}>
                      {areaObj.strArea}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label>Number of Recipes</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={recipeCount}
                  onChange={(e) => setRecipeCount(Number(e.target.value))}
                />
              </div>

              <button type="submit" className="generate-btn">
                {loading ? "Generating..." : "Generate Recipes"}
              </button>
            </form>
          </div>

          <div className="card recipe-card">
            {!recipesData?.recipes ? (
              <div className="empty-state">
                <h2>Your recipes will appear here</h2>
                <p>
                  Once you generate recipes, they will show up here in a cleaner
                  format.
                </p>
              </div>
            ) : (
              <div className="recipe-carousel">
                <div className="carousel-header">
                  <button className="nav-btn" onClick={handlePrevRecipe}>
                    ←
                  </button>

                  <p className="recipe-counter">
                    Recipe {currentRecipeIndex + 1} of {recipesData.recipes.length}
                  </p>

                  <button className="nav-btn" onClick={handleNextRecipe}>
                    →
                  </button>
                </div>

                <div className="recipe-card-item">
                  <span className="recipe-tag">
                    {recipesData.recipes[currentRecipeIndex].culture}
                  </span>

                  <h2>{recipesData.recipes[currentRecipeIndex].title}</h2>
                  <p>{recipesData.recipes[currentRecipeIndex].description}</p>

                  <div className="recipe-section">
                        <p>
                          <strong>Prep Time:</strong>{" "}
                          {recipesData.recipes[currentRecipeIndex].prepTime}
                        </p>
                        <p>
                          <strong>Cook Time:</strong>{" "}
                          {recipesData.recipes[currentRecipeIndex].cookTime}
                        </p>
                        <p>
                          <strong>Servings:</strong>{" "}
                          {recipesData.recipes[currentRecipeIndex].servings}
                        </p>
                   </div>

                  <button
                    className="show-more-btn"
                    onClick={() => setShowDetails((prev) => !prev)}
                  >
                    {showDetails ? "Show Less" : "Show More"}
                  </button>

                  {showDetails && (
                    <>
                      <div className="recipe-section">
                        <h3>Ingredients</h3>
                        <ul>
                          {recipesData.recipes[currentRecipeIndex].ingredients.map(
                            (ingredient, i) => (
                              <li key={i}>{ingredient}</li>
                            )
                          )}
                        </ul>
                      </div>

                      <div className="recipe-section">
                        <h3>Instructions</h3>
                        <ol>
                          {recipesData.recipes[currentRecipeIndex].instructions.map(
                            (step, i) => (
                              <li key={i}>{step}</li>
                            )
                          )}
                        </ol>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Header />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/about" element={<About />} />
        <Route path="/login" element={<Login />} />
        <Route path='/signup' element={<Signup />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;