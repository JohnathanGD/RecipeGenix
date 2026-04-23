import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  COOK_TIME_SELECTABLE,
  DIETARY_STYLE_OPTIONS,
  COOKING_GOAL_OPTIONS,
  sanitizeCookTimeInput,
} from "../shared/userPreferences.js";
import "./css/App.css";

export default function Signup() {
  const navigate = useNavigate();
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

  const setPref = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
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
          maxCookTime: sanitizeCookTimeInput(formData.maxCookTime),
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
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page signup-page">
      <section className="hero signup-hero">
        <div className="hero-text signup-hero-inner">
          <h1>Create your account</h1>
          <p className="signup-tagline">
            Set your kitchen profile once — we tailor recipes like a fitness app
            sets your plan.
          </p>

          <form className="signup-form" onSubmit={handleSubmit}>
            <div className="signup-card signup-card--identity">
              <p className="prefs-fitness-kicker">Account</p>
              <h2 className="signup-card-title">Basics</h2>
              <div className="signup-field-grid">
                <input
                  type="text"
                  name="firstName"
                  placeholder="First name"
                  value={formData.firstName}
                  required
                  onChange={handleChange}
                />
                <input
                  type="text"
                  name="lastName"
                  placeholder="Last name"
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
                  className="signup-span-2"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  required
                  onChange={handleChange}
                  className="signup-span-2"
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  value={formData.password}
                  required
                  onChange={handleChange}
                  className="signup-span-2"
                />
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm password"
                  value={formData.confirmPassword}
                  required
                  onChange={handleChange}
                  className="signup-span-2"
                />
              </div>
            </div>

            <div className="signup-card signup-card--prefs">
              <p className="prefs-fitness-kicker">Your cooking profile</p>
              <h2 className="signup-card-title">How you like to eat</h2>

              <div className="pref-panel pref-panel--signup">
                <h3 className="pref-panel__title">Typical cook window</h3>
                <p className="pref-panel__hint">
                  Choose the slot that matches most weeknights — we keep recipes in
                  range.
                </p>
                <div className="pref-chip-grid pref-chip-grid--tight">
                  {COOK_TIME_SELECTABLE.map((opt) => (
                    <button
                      key={opt.value || "none"}
                      type="button"
                      className={`pref-chip${
                        formData.maxCookTime === opt.value
                          ? " pref-chip--active"
                          : ""
                      }`}
                      onClick={() => setPref("maxCookTime", opt.value)}
                    >
                      <span className="pref-chip__label">{opt.label}</span>
                      {opt.hint ? (
                        <span className="pref-chip__hint">{opt.hint}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pref-panel pref-panel--signup">
                <h3 className="pref-panel__title">Eating style</h3>
                <p className="pref-panel__hint">Diet pattern recipes should follow.</p>
                <div className="pref-chip-grid">
                  {DIETARY_STYLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value || "unset"}
                      type="button"
                      className={`pref-chip pref-chip--compact${
                        formData.dietaryStyle === opt.value
                          ? " pref-chip--active"
                          : ""
                      }`}
                      onClick={() => setPref("dietaryStyle", opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pref-panel pref-panel--signup">
                <h3 className="pref-panel__title">Kitchen focus</h3>
                <p className="pref-panel__hint">What “winning” looks like for your meals.</p>
                <div className="pref-chip-grid">
                  {COOKING_GOAL_OPTIONS.map((opt) => (
                    <button
                      key={opt.value || "unset-goal"}
                      type="button"
                      className={`pref-chip pref-chip--compact${
                        formData.cookingGoal === opt.value
                          ? " pref-chip--active"
                          : ""
                      }`}
                      onClick={() => setPref("cookingGoal", opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pref-panel pref-panel--signup">
                <h3 className="pref-panel__title">Details</h3>
                <div className="signup-field-grid">
                  <input
                    type="text"
                    name="allergies"
                    placeholder="Allergies (comma separated)"
                    value={formData.allergies}
                    onChange={handleChange}
                    className="signup-span-2"
                  />
                  <input
                    type="text"
                    name="dislikes"
                    placeholder="Disliked ingredients (comma separated)"
                    value={formData.dislikes}
                    onChange={handleChange}
                    className="signup-span-2"
                  />
                  <input
                    type="text"
                    name="favoriteCuisines"
                    placeholder="Favorite cuisines (comma separated)"
                    value={formData.favoriteCuisines}
                    onChange={handleChange}
                    className="signup-span-2"
                  />
                  <label className="signup-household-label signup-span-2">
                    Household size
                    <input
                      type="number"
                      name="householdSize"
                      min="1"
                      max="12"
                      value={formData.householdSize}
                      onChange={handleChange}
                      className="signup-household-input"
                    />
                  </label>
                </div>
              </div>
            </div>

            {error && <p className="account-message account-message--error">{error}</p>}
            {success && (
              <p className="account-message account-message--success">{success}</p>
            )}

            <button type="submit" className="generate-btn signup-submit" disabled={loading}>
              {loading ? "Creating account…" : "Start cooking"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
