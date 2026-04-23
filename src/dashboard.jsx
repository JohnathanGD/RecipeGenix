import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./css/App.css";

function parseGroceryListItems(text) {
  if (!text || !String(text).trim()) return [];
  return text
    .split(/\r?\n/)
    .flatMap((line) => line.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function buildSessionUserFeedbackFromSaved(savedRecipes) {
  if (!Array.isArray(savedRecipes) || !savedRecipes.length) return "";
  const lines = [];
  for (const recipe of savedRecipes) {
    const fb = recipe.userFeedback;
    if (!fb) continue;
    const noteStr = (fb.notes || "").trim();
    if (!fb.rating && !noteStr) continue;
    const title = recipe.title || "Saved recipe";
    const bits = [`Saved recipe "${title}"`];
    if (fb.rating === "up") bits.push("user liked it after trying (thumbs up)");
    else if (fb.rating === "down") {
      bits.push("user did not like it after trying (thumbs down)");
    }
    if (noteStr) bits.push(`notes: ${noteStr}`);
    lines.push(`- ${bits.join(" — ")}`);
    if (lines.length >= 15) break;
  }
  return lines.join("\n");
}

export default function Dashboard() {
  const [ingredients, setIngredients] = useState("");
  const [preferences, setPreferences] = useState("");
  const [recipesData, setRecipesData] = useState(null);
  const [currentRecipeIndex, setCurrentRecipeIndex] = useState(0);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clarifyLoading, setClarifyLoading] = useState(false);
  const [clarificationQuestions, setClarificationQuestions] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState([]);
  const [reviseLoading, setReviseLoading] = useState(false);
  const [revisionRequest, setRevisionRequest] = useState("");
  const [autoReviseLowScore, setAutoReviseLowScore] = useState(true);
  const [agentTrace, setAgentTrace] = useState(null);
  const [showAgentTrace, setShowAgentTrace] = useState(false);
  const [pendingRevision, setPendingRevision] = useState(null);
  const [revisionTrace, setRevisionTrace] = useState(null);
  const [activeTab, setActiveTab] = useState("home");
  const [culture, setCulture] = useState("");
  const [recipeCount, setRecipeCount] = useState(10);
  const [areas, setAreas] = useState([]);
  const groceryFileInputRef = useRef(null);
  const [groceryLists, setGroceryLists] = useState([]);
  const [selectedRecipeListId, setSelectedRecipeListId] = useState("");
  const [savedRecipeSearch, setSavedRecipeSearch] = useState("");
  const [savedRecipeCultureFilter, setSavedRecipeCultureFilter] = useState("all");
  const [savedRecipeScoreFilter, setSavedRecipeScoreFilter] = useState("all");
  const [newListName, setNewListName] = useState("");
  const [groceryListText, setGroceryListText] = useState("");
  const [groceryUploadLoading, setGroceryUploadLoading] = useState(false);
  const token = localStorage.getItem("token");
  const [savedRecipes, setSavedRecipes] = useState([]);
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const username = user?.firstName;
  const currentRecipe = recipesData?.recipes?.[currentRecipeIndex];
  const savedRecipeCultureOptions = Array.from(
    new Set(
      savedRecipes
        .map((recipe) => recipe.culture || "Unknown")
        .filter(Boolean)
    )
  );
  const normalizedSavedRecipeSearch = savedRecipeSearch.trim().toLowerCase();
  const filteredSavedRecipes = savedRecipes.filter((recipe) => {
    const title = (recipe.title || "").toLowerCase();
    const description = (recipe.description || "").toLowerCase();
    const cultureName = recipe.culture || "Unknown";
    const score = Number(recipe?.evaluation?.overallScore);

    const matchesSearch =
      !normalizedSavedRecipeSearch ||
      title.includes(normalizedSavedRecipeSearch) ||
      description.includes(normalizedSavedRecipeSearch);

    const matchesCulture =
      savedRecipeCultureFilter === "all" ||
      cultureName === savedRecipeCultureFilter;

    let matchesScore = true;
    if (savedRecipeScoreFilter === "8plus") {
      matchesScore = Number.isFinite(score) && score >= 8;
    } else if (savedRecipeScoreFilter === "5to7") {
      matchesScore = Number.isFinite(score) && score >= 5 && score < 8;
    } else if (savedRecipeScoreFilter === "below5") {
      matchesScore = Number.isFinite(score) && score < 5;
    } else if (savedRecipeScoreFilter === "unrated") {
      matchesScore = !Number.isFinite(score);
    }

    return matchesSearch && matchesCulture && matchesScore;
  });

  const getScoreClass = (overallScore) => {
    const numericScore = Number(overallScore);

    if (Number.isNaN(numericScore)) return "score-badge--low";
    if (numericScore >= 8) return "score-badge--high";
    if (numericScore >= 5) return "score-badge--mid";
    return "score-badge--low";
  };

  const handleUseSavedListForRecipe = (listId) => {
    setSelectedRecipeListId(listId);
    const list = groceryLists.find((g) => String(g.id) === String(listId));
    if (!list) return;
    const listItems = Array.isArray(list.items) ? list.items : [];
    setIngredients(listItems.join(", "));
  };

  const handleGroceryUploadClick = () => {
    groceryFileInputRef.current?.click();
  };

  const handleGroceryFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setGroceryUploadLoading(true);
    try {
      const res = await fetch("http://localhost:5050/extract-ingredients", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to read list from file");
      }

      if (Array.isArray(data.ingredients) && data.ingredients.length) {
        setGroceryListText(data.ingredients.join("\n"));
      } else {
        alert("No items could be extracted from that file.");
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to process file");
    } finally {
      setGroceryUploadLoading(false);
      event.target.value = "";
    }
  };

  const handleAddList = async () => {
    const items = parseGroceryListItems(groceryListText);
    if (!newListName.trim()) {
      alert("Please enter a name for your grocery list.");
      return;
    }
    if (items.length === 0) {
      alert(
        "Add at least one item: type them in the box below, or upload a PDF or .txt file."
      );
      return;
    }

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
          items,
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
      setGroceryListText("");
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
      const payload = {
        title: recipe.title,
        culture: recipe.culture,
        description: recipe.description,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        prepTime: recipe.prepTime,
        cookTime: recipe.cookTime,
        servings: recipe.servings,
        evaluation: recipe.evaluation || null,
      };

      const res = await fetch("http://localhost:5050/saved-recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
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

  const handleClarificationAnswerChange = (idx, value) => {
    setClarificationAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  const handleGetClarifications = async () => {
    if (!ingredients.trim()) {
      alert("Enter ingredients first so the agent can ask better questions.");
      return;
    }

    setClarifyLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5050/clarify-recipe-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ingredients,
          preferences,
          culture,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch clarification questions.");
      }
      const questions = Array.isArray(data.questions) ? data.questions : [];
      setClarificationQuestions(questions);
      setClarificationAnswers(new Array(questions.length).fill(""));
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to fetch clarification questions.");
    } finally {
      setClarifyLoading(false);
    }
  };

  const buildClarificationContext = () => {
    if (!clarificationQuestions.length) return "";
    return clarificationQuestions
      .map((question, idx) => {
        const answer = clarificationAnswers[idx]?.trim();
        return answer ? `Q: ${question}\nA: ${answer}` : null;
      })
      .filter(Boolean)
      .join("\n\n");
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
      const sessionUserFeedback = buildSessionUserFeedbackFromSaved(savedRecipes);

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
          clarificationContext: buildClarificationContext(),
          autoReviseLowScore,
          ...(sessionUserFeedback
            ? { sessionUserFeedback }
            : {}),
        }),
      });

      const data = await res.json();

      console.log("Generated recipe response:", data);

      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      setRecipesData(data);
      setAgentTrace(data.agentTrace || null);
      setCurrentRecipeIndex(0);
      setShowDetails(false);
      setRevisionRequest("");
      setShowAgentTrace(false);
      setPendingRevision(null);
      setRevisionTrace(null);
      setClarificationQuestions([]);
      setClarificationAnswers([]);
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

  const handleReviseCurrentRecipe = async (requestText) => {
    const activeRequest = requestText || revisionRequest;
    if (!activeRequest?.trim()) {
      alert("Enter a revision request first.");
      return;
    }
    if (!currentRecipe) return;

    setReviseLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5050/revise-recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          recipe: currentRecipe,
          revisionRequest: activeRequest,
          ingredients,
          preferences,
          culture,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to revise recipe.");
      }

      setPendingRevision(data.recipe || null);
      setRevisionTrace(data.trace || null);
      setShowDetails(true);
    } catch (error) {
      console.error(error);
      alert(error.message || "Failed to revise recipe.");
    } finally {
      setReviseLoading(false);
    }
  };

  const handleApplyPendingRevision = () => {
    if (!pendingRevision) return;
    setRecipesData((prev) => {
      if (!prev?.recipes?.length) return prev;
      const nextRecipes = [...prev.recipes];
      nextRecipes[currentRecipeIndex] = pendingRevision;
      return { ...prev, recipes: nextRecipes };
    });
    setPendingRevision(null);
    setRevisionRequest("");
  };

  const handleRejectPendingRevision = () => {
    setPendingRevision(null);
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
        <section className="hero dashboard-hero">
          <div className="hero-text">
            <span className="badge">AI-Powered Meal Creation</span>
            <h1>Dashboard</h1>
            <p className="section-text">
              Manage your lists, generate recipes, and iterate with the agent in
              one workspace.
            </p>
          </div>
          <p className="dashboard-welcome">Welcome {user?.firstName}!</p>
        </section>
        <section className="dashboard-stats">
          <article className="stat-card">
            <p className="stat-card__label">Saved recipes</p>
            <p className="stat-card__value">{savedRecipes.length}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Grocery lists</p>
            <p className="stat-card__value">{groceryLists.length}</p>
          </article>
          <article className="stat-card">
            <p className="stat-card__label">Agent mode</p>
            <p className="stat-card__value">{autoReviseLowScore ? "Auto revise ON" : "Manual revise"}</p>
          </article>
        </section>
        <section className="dashboard-tabs" aria-label="Dashboard sections">
          <button
            type="button"
            className={`dashboard-tab ${activeTab === "home" ? "dashboard-tab--active" : ""}`}
            onClick={() => setActiveTab("home")}
          >
            Home
          </button>
          <button
            type="button"
            className={`dashboard-tab ${activeTab === "generate" ? "dashboard-tab--active" : ""}`}
            onClick={() => setActiveTab("generate")}
          >
            Generate Recipes
          </button>
        </section>
        <section className="dashboard">
            {activeTab === "home" && (
            <section className="app-grid dashboard-grid-top">
            <div className="card dashboard-panel dashboard-panel--data">
                <div className="panel-head">
                  <h2>Grocery lists</h2>
                  <span className="panel-role panel-role--data">Data/Admin</span>
                </div>
                <p className="section-text">
                Create a list by typing items below or uploading a PDF or .txt file to
                have it analyzed and turned into items. Name the list, then use{" "}
                <strong>Save list</strong> next to upload.
                </p>

                <div className="add-list">
                <input
                    type="text"
                    placeholder="New List name..."
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                />
                <label className="input-group grocery-list-label">
                  <span>List items</span>
                  <textarea
                    className="grocery-list-textarea"
                    placeholder="One item per line, or comma-separated (e.g. milk, eggs, bread)"
                    value={groceryListText}
                    onChange={(e) => setGroceryListText(e.target.value)}
                    rows={5}
                  />
                </label>
                <div className="grocery-upload-row">
                  <button
                    type="button"
                    className="generate-btn grocery-upload-btn"
                    onClick={handleGroceryUploadClick}
                    disabled={groceryUploadLoading}
                  >
                    {groceryUploadLoading ? "Analyzing file…" : "Upload PDF or .txt"}
                  </button>
                  <input
                    ref={groceryFileInputRef}
                    type="file"
                    accept=".pdf,.txt,application/pdf,text/plain"
                    onChange={handleGroceryFileChange}
                    style={{ display: "none" }}
                  />
                  <button
                    type="button"
                    className="generate-btn save-list-btn"
                    onClick={handleAddList}
                    title="Save grocery list"
                    aria-label="Save grocery list"
                  >
                    Save List
                  </button>
                </div>
                </div>

                <div className="list-container">
                {groceryLists.length === 0 ? (
                    <p className="empty-text">No grocery lists yet.</p>
                ) : (
                    groceryLists.map((list) => (
                    <Link
                        key={list.id}
                        to={`/dashboard/grocery-list/${list.id}`}
                        className="list-item list-item--clickable"
                    >
                        {list.name}
                        <p className="list-item__hint">View full list →</p>
                    </Link>
                    ))
                )}
                </div>
            </div>

            <div className="card dashboard-panel dashboard-panel--data">
                <div className="panel-head">
                  <h2>Saved Recipes</h2>
                  <span className="panel-role panel-role--data">Data/Admin</span>
                </div>
                <p className="section-text">
                  Open a recipe to cook it, then add your feedback there. That
                  feedback is used the next time you generate recipes.
                </p>
                <div className="saved-recipe-filters">
                  <input
                    type="text"
                    value={savedRecipeSearch}
                    onChange={(e) => setSavedRecipeSearch(e.target.value)}
                    placeholder="Search title or description..."
                  />
                  <select
                    value={savedRecipeCultureFilter}
                    onChange={(e) => setSavedRecipeCultureFilter(e.target.value)}
                  >
                    <option value="all">All cultures</option>
                    {savedRecipeCultureOptions.map((cultureName) => (
                      <option key={cultureName} value={cultureName}>
                        {cultureName}
                      </option>
                    ))}
                  </select>
                  <select
                    value={savedRecipeScoreFilter}
                    onChange={(e) => setSavedRecipeScoreFilter(e.target.value)}
                  >
                    <option value="all">All scores</option>
                    <option value="8plus">8+ score</option>
                    <option value="5to7">5 to 7.9</option>
                    <option value="below5">Below 5</option>
                    <option value="unrated">Unrated</option>
                  </select>
                  <button
                    type="button"
                    className="show-more-btn saved-filter-reset"
                    onClick={() => {
                      setSavedRecipeSearch("");
                      setSavedRecipeCultureFilter("all");
                      setSavedRecipeScoreFilter("all");
                    }}
                  >
                    Clear
                  </button>
                </div>
                <p className="saved-recipes-count">
                  Showing {filteredSavedRecipes.length} of {savedRecipes.length} recipes
                </p>

                <div className="list-container saved-recipes-list">
                {filteredSavedRecipes.length === 0 ? (
                    <p className="empty-text">No saved recipes yet.</p>
                ) : (
                    filteredSavedRecipes.map((recipe) => (
                    <Link
                        key={recipe.id}
                        to={`/dashboard/saved-recipe/${recipe.id}`}
                        className="list-item list-item--clickable saved-recipe-item"
                    >
                        <strong className="saved-recipe-item__title">{recipe.title}</strong>
                        <p className="saved-recipe-item__meta">
                          {recipe.culture || "Any cuisine"} • {recipe.cook_time || "Cook time n/a"}
                        </p>
                        <p className="saved-recipe-item__desc">{recipe.description}</p>

                        {recipe.evaluation?.overallScore != null && (
                        <p
                          className={`score-badge saved-recipe-item__score ${getScoreClass(
                            recipe.evaluation.overallScore
                          )}`}
                        >
                            Agent Score: {recipe.evaluation.overallScore}/10
                        </p>
                        )}

                        {(recipe.userFeedback?.rating ||
                          recipe.userFeedback?.notes?.trim()) && (
                          <p className="section-text saved-recipe-item__cook-feedback">
                            <strong>Your feedback:</strong>{" "}
                            {recipe.userFeedback.rating === "up"
                              ? "Thumbs up"
                              : recipe.userFeedback.rating === "down"
                                ? "Thumbs down"
                                : ""}
                            {recipe.userFeedback?.notes?.trim()
                              ? `${recipe.userFeedback.rating ? " — " : ""}${recipe.userFeedback.notes.trim()}`
                              : ""}
                          </p>
                        )}
                        {recipe.evaluation?.revisionNotes && (
                          <p className="section-text saved-recipe-item__feedback">
                            <strong>Agent notes:</strong>{" "}
                            {recipe.evaluation.revisionNotes}
                          </p>
                        )}
                        <p className="list-item__hint saved-recipe-item__hint">View full recipe →</p>
                    </Link>
                    ))
                )}
                </div>
            </div>
            </section>
            )}

            {activeTab === "generate" && (
            <section className="app-grid dashboard-grid-main">
            <div className="card dashboard-panel dashboard-panel--data">
                <div className="panel-head">
                  <h2>Recipe Inputs</h2>
                  <span className="panel-role panel-role--data">Data/Admin</span>
                </div>
                <p className="section-text">
                Tell the model what ingredients you have and how you want the meal
                to turn out.
                </p>

                <p className="section-text">
                Pull ingredients directly from one of your saved grocery lists.
                </p>

                <div className="input-group">
                  <label>Use a saved grocery list</label>
                  <select
                    value={selectedRecipeListId}
                    onChange={(e) => handleUseSavedListForRecipe(e.target.value)}
                  >
                    <option value="">Select a saved grocery list</option>
                    {groceryLists.map((list) => (
                      <option key={list.id} value={list.id}>
                        {list.name}
                      </option>
                    ))}
                  </select>
                </div>

                <p className="section-text">
                If you don&apos;t use a list, type the ingredients you want in your
                recipes below.
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
                    placeholder="Example: high protein, low carb, spicy"
                    value={preferences}
                    onChange={(e) => setPreferences(e.target.value)}
                    />
                </div>

                <div className="input-group clarify-agent-block">
                    <p className="section-text clarify-agent-block__desc">
                      Optional step before you generate: the agent proposes a few
                      short questions (time, portions, what to avoid, etc.) based
                      on your ingredients and preferences. Answer any you care about —
                      those replies are bundled into the next generation only, then
                      this panel clears after recipes are created so you can start
                      fresh next time.
                    </p>
                    <button
                      type="button"
                      className="show-more-btn"
                      onClick={handleGetClarifications}
                      disabled={clarifyLoading}
                    >
                      {clarifyLoading ? "Agent is asking..." : "Ask agent clarifying questions"}
                    </button>
                </div>

                {clarificationQuestions.length > 0 && (
                  <div className="recipe-section">
                    <h3>Agent clarification step</h3>
                    {clarificationQuestions.map((q, idx) => (
                      <div className="input-group" key={`${q}-${idx}`}>
                        <label>{q}</label>
                        <input
                          type="text"
                          value={clarificationAnswers[idx] || ""}
                          onChange={(e) =>
                            handleClarificationAnswerChange(idx, e.target.value)
                          }
                          placeholder="Your answer (optional)"
                        />
                      </div>
                    ))}
                  </div>
                )}

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

                <label className="auto-revise-toggle">
                  <span className="auto-revise-toggle__copy">
                    <span className="auto-revise-toggle__title">
                      Auto-revise weak drafts
                    </span>
                    <span className="auto-revise-toggle__hint">
                      When on, the critic pass automatically tightens any recipe scored
                      under 7 before you see results.
                    </span>
                  </span>
                  <span className="auto-revise-toggle__switch-wrap">
                    <input
                      type="checkbox"
                      className="auto-revise-toggle__input"
                      checked={autoReviseLowScore}
                      onChange={(e) => setAutoReviseLowScore(e.target.checked)}
                      aria-label="Auto-revise recipes scored below 7"
                    />
                    <span className="auto-revise-toggle__track" aria-hidden>
                      <span className="auto-revise-toggle__thumb" />
                    </span>
                  </span>
                </label>

                <button type="submit" className="generate-btn">
                    {loading ? "Generating..." : "Generate Recipes"}
                </button>
                </form>
            </div>

            <div className="card recipe-card dashboard-panel dashboard-panel--agent dashboard-panel--sticky">
                <div className="panel-head panel-head--agent">
                  <h2>Agent Workspace</h2>
                  <span className="panel-role panel-role--agent">Agent</span>
                </div>
                {!recipesData?.recipes ? (
                <div className="empty-state">
                    <h2>Your recipes will appear here</h2>
                    <p>
                    Once you generate recipes, they will show up here in a cleaner
                    format.
                    </p>
                    {loading && (
                      <div className="empty-state-loading" role="status" aria-live="polite">
                        <span className="spinner" aria-hidden="true" />
                        <p>Generating recipes with the agent...</p>
                      </div>
                    )}
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
                    {agentTrace && (
                      <div className="agent-trace-toggle-wrap">
                        <button
                          type="button"
                          className="show-more-btn agent-trace-toggle"
                          onClick={() => setShowAgentTrace((prev) => !prev)}
                        >
                          {showAgentTrace ? "Hide Agent Trace" : "Show Agent Trace"}
                        </button>
                      </div>
                    )}

                    {agentTrace && showAgentTrace && (
                      <div className="recipe-section agent-trace">
                        <h3>Agent Trace</h3>
                        {agentTrace.planner?.goal && (
                          <p>
                            <strong>Goal:</strong> {agentTrace.planner.goal}
                          </p>
                        )}
                        {Array.isArray(agentTrace.planner?.keyConstraints) &&
                          agentTrace.planner.keyConstraints.length > 0 && (
                            <p>
                              <strong>Constraints:</strong>{" "}
                              {agentTrace.planner.keyConstraints.join(", ")}
                            </p>
                          )}
                        {Array.isArray(agentTrace.planner?.steps) &&
                          agentTrace.planner.steps.length > 0 && (
                            <>
                              <p>
                                <strong>Plan Steps:</strong>
                              </p>
                              <ol className="agent-trace-list">
                                {agentTrace.planner.steps.map((step, idx) => (
                                  <li key={`${step}-${idx}`}>{step}</li>
                                ))}
                              </ol>
                            </>
                          )}
                        {agentTrace.criticSummary && (
                          <p>
                            <strong>Critic:</strong> average score{" "}
                            {agentTrace.criticSummary.averageScore ?? "n/a"}; low
                            score recipes {agentTrace.criticSummary.lowScoreCount};{" "}
                            auto-revise {agentTrace.criticSummary.autoRevisedLowScores
                              ? "ON"
                              : "OFF"}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="recipe-card-item">
                    <span className="recipe-tag">{currentRecipe.culture}</span>

                    <h2>{currentRecipe.title}</h2>
                    <p>{currentRecipe.description}</p>

                    {currentRecipe?.evaluation && (
                         <p
                          className={`score-badge ${getScoreClass(
                            currentRecipe.evaluation.overallScore
                          )}`}
                        >
                        Agent Score: {currentRecipe.evaluation.overallScore}/10
                        </p>
                    )}

                    <p className="section-text recipe-save-hint">
                      Save a recipe to your list, try it at home, then add thumbs
                      and notes on the saved recipe page — that feedback shapes your
                      next generation run.
                    </p>

                    {currentRecipe?.whyRecommended && (
                      <div className="recipe-section why-section">
                        <h3>Why the agent recommends this</h3>
                        <p>{currentRecipe.whyRecommended}</p>
                        {Array.isArray(currentRecipe?.tradeoffs) &&
                          currentRecipe.tradeoffs.length > 0 && (
                            <>
                              <p>
                                <strong>Tradeoffs</strong>
                              </p>
                              <ul>
                                {currentRecipe.tradeoffs.map((tradeoff, idx) => (
                                  <li key={`${tradeoff}-${idx}`}>{tradeoff}</li>
                                ))}
                              </ul>
                            </>
                          )}
                      </div>
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

                        {Array.isArray(currentRecipe.ingredientsToBuy) &&
                          currentRecipe.ingredientsToBuy.length > 0 && (
                            <div className="recipe-section">
                              <h3>Ingredients to Buy</h3>
                              <ul>
                                {currentRecipe.ingredientsToBuy.map((item, i) => (
                                  <li key={`${item}-${i}`}>{item}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                        <div className="recipe-section">
                            <h3>Instructions</h3>
                            <ol>
                            {currentRecipe.instructions.map((step, i) => (
                                <li key={i}>{step}</li>
                            ))}
                            </ol>
                        </div>

                        <div className="recipe-section">
                          <h3>Revise this recipe with the agent</h3>
                          <div className="revision-presets">
                            <button
                              type="button"
                              className="show-more-btn"
                              onClick={() => handleReviseCurrentRecipe("Make this recipe vegetarian.")}
                              disabled={reviseLoading}
                            >
                              Make Vegetarian
                            </button>
                            <button
                              type="button"
                              className="show-more-btn"
                              onClick={() => handleReviseCurrentRecipe("Reduce spice level and keep flavor strong.")}
                              disabled={reviseLoading}
                            >
                              Less Spicy
                            </button>
                            <button
                              type="button"
                              className="show-more-btn"
                              onClick={() => handleReviseCurrentRecipe("Make this recipe cheaper with budget-friendly substitutions.")}
                              disabled={reviseLoading}
                            >
                              Budget Version
                            </button>
                            <button
                              type="button"
                              className="show-more-btn"
                              onClick={() => handleReviseCurrentRecipe("Adjust this recipe to be under 30 minutes total time.")}
                              disabled={reviseLoading}
                            >
                              Under 30 Min
                            </button>
                          </div>
                          <input
                            type="text"
                            placeholder="Custom revision request..."
                            value={revisionRequest}
                            onChange={(e) => setRevisionRequest(e.target.value)}
                          />
                          <button
                            type="button"
                            className="generate-btn"
                            onClick={() => handleReviseCurrentRecipe()}
                            disabled={reviseLoading}
                          >
                            {reviseLoading ? "Revising..." : "Revise recipe"}
                          </button>
                          {pendingRevision && (
                            <div className="pending-revision-box">
                              <p>
                                <strong>Pending Revision:</strong>{" "}
                                {pendingRevision.title}
                              </p>
                              <p>{pendingRevision.description}</p>
                              {revisionTrace?.revisionRequest && (
                                <p>
                                  <strong>Requested change:</strong>{" "}
                                  {revisionTrace.revisionRequest}
                                </p>
                              )}
                              {revisionTrace?.userFeedback && (
                                <p>
                                  <strong>User feedback included:</strong>{" "}
                                  {revisionTrace.userFeedback.sentiment}
                                  {revisionTrace.userFeedback.notes
                                    ? ` — ${revisionTrace.userFeedback.notes}`
                                    : ""}
                                </p>
                              )}
                              <div className="pending-actions">
                                <button
                                  type="button"
                                  className="generate-btn"
                                  onClick={handleApplyPendingRevision}
                                >
                                  Apply revision
                                </button>
                                <button
                                  type="button"
                                  className="show-more-btn"
                                  onClick={handleRejectPendingRevision}
                                >
                                  Reject revision
                                </button>
                              </div>
                            </div>
                          )}
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
            )}
        </section>
      </main>
    </>
  );
}