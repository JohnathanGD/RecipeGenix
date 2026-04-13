import { useState, useEffect, useRef} from "react";
import "./css/App.css";
import Hero from "./assets/testphoto.jpg";

export default function Dashboard() {
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
    const [groceryLists, setGroceryLists] = useState([]);
    const [newListName, setNewListName] = useState("");
    const token = localStorage.getItem("token");
    const [savedRecipes, setSavedRecipes] = useState([]);
    const user = JSON.parse(localStorage.getItem("user") || "null");
    const username = user?.firstName;
    const currentRecipe = recipesData?.recipes?.[currentRecipeIndex];
  
    const handleClick = () => {
      fileInputRef.current.click();
    }
  
    const handleFileChange = async (event) => {
      const file = event.target.files[0];
      if (!file) return;
    
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

    const handleAddList = async () => {
        if (!newListName.trim()) return;
      
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Please log in to save grocery lists.");
          return;
        }
      
        try {
          const res = await fetch("http://localhost:5050/grocery-lists", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: newListName,
              items: ingredients
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
            }),
          });
      
          const data = await res.json();
      
          if (!res.ok) {
            throw new Error(data.error || "Failed to save grocery list.");
          }
      
          const refreshRes = await fetch("http://localhost:5050/grocery-lists", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
      
          const refreshedLists = await refreshRes.json();
          if (refreshRes.ok) {
            setGroceryLists(refreshedLists);
          }
      
          setNewListName("");
        } catch (error) {
          console.error(error);
          alert(error.message);
        }
      };

    const handleSaveRecipe = async () => {
        
        const token = localStorage.getItem("token");
        if (!token) {
          alert("Please log in to save recipes.");
          return;
        }
      
        const recipe = recipesData?.recipes?.[currentRecipeIndex];
        if (!recipe) return;
      
        try {
          const res = await fetch("http://localhost:5050/saved-recipes", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(recipe),
          });
      
          const data = await res.json();
      
          if (!res.ok) {
            throw new Error(data.error || "Failed to save recipe.");
          }
      
          const refreshRes = await fetch("http://localhost:5050/saved-recipes", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
      
          const refreshedRecipes = await refreshRes.json();
          if (refreshRes.ok) {
            setSavedRecipes(refreshedRecipes);
          }
      
          alert("Recipe saved successfully!");
        } catch (error) {
          console.error(error);
          alert(error.message);
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
        const token = localStorage.getItem("token");

        const res = await fetch("http://localhost:5050/generate-recipe", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
            ingredients,
            preferences,
            culture,
            recipeCount,
        }),
        });
  
        const data = await res.json();

        console.log("Generated recipe response:", data);
  
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

    useEffect(() => {
        async function fetchUserData() {
          const token = localStorage.getItem("token");
          if (!token) return;
      
          try {
            const [groceryRes, recipeRes] = await Promise.all([
              fetch("http://localhost:5050/grocery-lists", {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }),
              fetch("http://localhost:5050/saved-recipes", {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }),
            ]);
      
            const groceryData = await groceryRes.json();
            const recipeData = await recipeRes.json();
      
            if (groceryRes.ok) setGroceryLists(groceryData);
            if (recipeRes.ok) setSavedRecipes(recipeData);
          } catch (error) {
            console.error("Failed to load user data:", error);
          }
        }
      
        fetchUserData();
      }, []);
  
    return (
      <>
  
        <main className="page">
          <h1>Dashboard</h1>
          <section className="hero">
            <div className="hero-text">
              <span className="badge">AI-Powered Meal Creation</span>
            </div>
            <h1>Welcome {user?.firstName}!</h1>
          </section>

          <section className="app-grid">
                <div className="card">
                    <h2>Grocery lists</h2>
                    <button className="add-btn" onClick={handleAddList}>+</button>
                    <p className="section-text">
                        Here are the grocery lists you have saved so far. To add another one, either upload a file in the recipe input section
                        or click the '+' icon above.
                    </p>

                    <div className="add-list">
                        <input
                        type="text"
                        placeholder="New List name..."
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        />
                    </div>

                    <div className="list-container">
                        {groceryLists.length === 0 ? (
                            <p className="empty-text">No grocery lists yet.</p>
                        ) : (
                            groceryLists.map((list) => (
                            <div
                                key={list.id}
                                className="list-item"
                                onClick={() => console.log(list)}
                            >
                                {list.name}
                            </div>
                            ))
                        )}
                    </div>
                </div>
    
                <div className="card">
                    <h2>Saved Recipes</h2>
                    <p className="section-text">
                        Here are your saved recipes. You can also choose to rate each recipe.
                    </p>

                    <div className="list-container">
                        {savedRecipes.length === 0 ? (
                        <p className="empty-text">No saved recipes yet.</p>
                        ) : (
                        savedRecipes.map((recipe) => (
                            <div key={recipe.id} className="list-item">
                            <strong>{recipe.title}</strong>
                            <p className="badge">{recipe.culture}</p>
                            <p>Cook time: {recipe.cook_time}</p>
                            <p className="section-text">{recipe.description}</p>
                            </div>
                        ))
                        )}
                    </div>
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
                        <span className="recipe-tag">{currentRecipe.culture}</span>

                        <h2>{currentRecipe.title}</h2>
                        <p>{currentRecipe.description}</p>

                        {currentRecipe?.evaluation && (
                        <p className="score-badge">
                            Agent Score: {currentRecipe.evaluation.overallScore}/10
                        </p>
                        )}

                        <div className="recipe-section">
                        <p>
                            <strong>Prep Time:</strong>{" "}
                            {currentRecipe.prepTime}
                        </p>
                        <p>
                            <strong>Cook Time:</strong>{" "}
                            {currentRecipe.cookTime}
                        </p>
                        <p>
                            <strong>Servings:</strong>{" "}
                            {currentRecipe.servings}
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
                            {currentRecipe?.evaluation && (
                            <div className="recipe-section">
                                <h3>Agent Evaluation</h3>
                                <p>
                                <strong>Dietary Fit:</strong>{" "}
                                {currentRecipe.evaluation.dietaryFit}
                                </p>
                                <p>
                                <strong>Allergy Safety:</strong>{" "}
                                {currentRecipe.evaluation.allergySafety}
                                </p>
                                <p>
                                <strong>Ingredient Fit:</strong>{" "}
                                {currentRecipe.evaluation.ingredientFit}
                                </p>
                                <p>
                                <strong>Preference Fit:</strong>{" "}
                                {currentRecipe.evaluation.preferenceFit}
                                </p>
                                <p>
                                <strong>Practicality:</strong>{" "}
                                {currentRecipe.evaluation.practicality}
                                </p>
                                <p>
                                <strong>Revision Notes:</strong>{" "}
                                {currentRecipe.evaluation.revisionNotes}
                                </p>
                            </div>
                            )}

                            <div className="recipe-section">
                            <h3>Ingredients</h3>
                            <ul>
                                {currentRecipe.ingredients.map((ingredient, i) => (
                                <li key={i}>{ingredient}</li>
                                ))}
                            </ul>
                            </div>

                            <div className="recipe-section">
                            <h3>Instructions</h3>
                            <ol>
                                {currentRecipe.instructions.map((step, i) => (
                                <li key={i}>{step}</li>
                                ))}
                            </ol>
                            </div>

                            <button className="generate-btn" onClick={handleSaveRecipe}>
                            Save Recipe
                            </button>
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