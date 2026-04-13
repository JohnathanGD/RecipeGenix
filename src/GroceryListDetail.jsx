import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./css/App.css";

export default function GroceryListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [list, setList] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to view grocery lists.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`http://localhost:5050/grocery-lists/${id}`, {
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
          throw new Error(data.error || "Could not load grocery list.");
        }
        setList(data);
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

      {loading && <p className="section-text">Loading grocery list...</p>}
      {error && !loading && (
        <p className="section-text" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && list && (
        <article className="card saved-recipe-detail__card">
          <h1>{list.name}</h1>
          <p className="section-text">Items in this list:</p>
          {Array.isArray(list.items) && list.items.length ? (
            <ul className="grocery-list-items">
              {list.items.map((item, index) => (
                <li key={`${item}-${index}`}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="section-text">This list is empty.</p>
          )}
        </article>
      )}
    </main>
  );
}
