import { useState } from "react";

export default function Signup() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    password: "",
    confirmPassword: "",
    dietaryStyle: "",
    allergies: "",
    dislikes: "",
    favoriteCuisines: "",
    cookingGoal: "",
    maxCookTime: "",
    spiceLevel: "",
    householdSize: 1,
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5050/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          dob: formData.dob,
          email: formData.email,
          password: formData.password,
          dietaryStyle: formData.dietaryStyle,
          allergies: formData.allergies,
          dislikes: formData.dislikes,
          favoriteCuisines: formData.favoriteCuisines,
          cookingGoal: formData.cookingGoal,
          maxCookTime: formData.maxCookTime,
          spiceLevel: formData.spiceLevel,
          householdSize: Number(formData.householdSize),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create account");
      }

      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setSuccess("Account created successfully");

      setFormData({
        firstName: "",
        lastName: "",
        dob: "",
        email: "",
        password: "",
        confirmPassword: "",
        dietaryStyle: "",
        allergies: "",
        dislikes: "",
        favoriteCuisines: "",
        cookingGoal: "",
        maxCookTime: "",
        spiceLevel: "",
        householdSize: 1,
      });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <h1>Sign Up</h1>

          <form className="input-group" onSubmit={handleSubmit}>
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              required
              onChange={handleChange}
            />

            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              required
              onChange={handleChange}
            />

            <input
              type="date"
              name="dob"
              value={formData.dob}
              required
              onChange={handleChange}
            />

            <input
              type="email"
              name="email"
              placeholder="Email"
              value={formData.email}
              required
              onChange={handleChange}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              required
              onChange={handleChange}
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Re-type Password"
              value={formData.confirmPassword}
              required
              onChange={handleChange}
            />

            <h3>Food Preferences</h3>

            <select
              name="dietaryStyle"
              value={formData.dietaryStyle}
              onChange={handleChange}
            >
              <option value="">Dietary Style</option>
              <option value="none">No Restriction</option>
              <option value="vegetarian">Vegetarian</option>
              <option value="vegan">Vegan</option>
              <option value="pescatarian">Pescatarian</option>
              <option value="keto">Keto</option>
              <option value="halal">Halal</option>
              <option value="gluten-free">Gluten-Free</option>
            </select>

            <input
              type="text"
              name="allergies"
              placeholder="Allergies (comma separated)"
              value={formData.allergies}
              onChange={handleChange}
            />

            <input
              type="text"
              name="dislikes"
              placeholder="Disliked ingredients (comma separated)"
              value={formData.dislikes}
              onChange={handleChange}
            />

            <input
              type="text"
              name="favoriteCuisines"
              placeholder="Favorite cuisines (comma separated)"
              value={formData.favoriteCuisines}
              onChange={handleChange}
            />

            <select
              name="cookingGoal"
              value={formData.cookingGoal}
              onChange={handleChange}
            >
              <option value="">Cooking Goal</option>
              <option value="quick-meals">Quick Meals</option>
              <option value="high-protein">High Protein</option>
              <option value="budget-friendly">Budget Friendly</option>
              <option value="healthy">Healthy</option>
              <option value="comfort-food">Comfort Food</option>
            </select>

            <select
              name="maxCookTime"
              value={formData.maxCookTime}
              onChange={handleChange}
            >
              <option value="">Max Cook Time</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="45">45 min</option>
              <option value="60">60 min</option>
            </select>

            <select
              name="spiceLevel"
              value={formData.spiceLevel}
              onChange={handleChange}
            >
              <option value="">Spice Preference</option>
              <option value="mild">Mild</option>
              <option value="medium">Medium</option>
              <option value="spicy">Spicy</option>
            </select>

            <input
              type="number"
              name="householdSize"
              placeholder="Household Size"
              min="1"
              max="12"
              value={formData.householdSize}
              onChange={handleChange}
            />

            {error && <p style={{ color: "red" }}>{error}</p>}
            {success && <p style={{ color: "green" }}>{success}</p>}

            <button type="submit" className="generate-btn" disabled={loading}>
              {loading ? "Creating Account..." : "Make Account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}