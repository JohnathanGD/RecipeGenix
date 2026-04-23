import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
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

    try {
      setLoading(true);

      const response = await fetch("http://localhost:5050/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      const from = location.state?.from?.pathname || "/dashboard";
      navigate(from, { replace: true });
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
          <h1>Login</h1>
          <p className="section-text auth-lead">
            Welcome back — sign in to open your dashboard and saved lists.
          </p>

          <div className="auth-card">
            <form className="input-group auth-form" onSubmit={handleSubmit}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                required
                value={formData.email}
                onChange={handleChange}
              />

              <input
                type="password"
                name="password"
                placeholder="Password"
                required
                value={formData.password}
                onChange={handleChange}
              />

              {error && (
                <p className="account-message account-message--error" role="alert">
                  {error}
                </p>
              )}

              <button type="submit" className="generate-btn" disabled={loading}>
                {loading ? "Signing in…" : "Sign in"}
              </button>

              <p className="auth-footer">
                Don&apos;t have an account?{" "}
                <Link to="/signup" className="auth-footer-link">
                  Sign up
                </Link>
              </p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}