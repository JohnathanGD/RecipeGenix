import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  COOK_TIME_SELECTABLE,
  DIETARY_STYLE_OPTIONS,
  COOKING_GOAL_OPTIONS,
  normalizeCookTimeStored,
} from "../shared/userPreferences.js";
import "./css/App.css";

function joinList(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function formatDobDisplay(iso) {
  if (!iso) return "—";
  try {
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function displayText(value, fallback = "—") {
  const s = value != null && String(value).trim() !== "" ? String(value).trim() : "";
  return s || fallback;
}

/** Shape from login/signup/localStorage `user` (mapUserRowToClient). */
function clientUserToFormData(u) {
  if (!u || typeof u !== "object") return null;
  const p = u.preferences || {};
  return {
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    dob: u.dob || "",
    email: u.email || "",
    dietaryStyle: p.dietaryStyle || "",
    allergies: joinList(p.allergies),
    dislikes: joinList(p.dislikes),
    favoriteCuisines: joinList(p.favoriteCuisines),
    cookingGoal: p.cookingGoal || "",
    maxCookTime: normalizeCookTimeStored(
      p.maxCookTime != null ? String(p.maxCookTime) : ""
    ),
    householdSize: p.householdSize ?? 1,
  };
}

export default function Account() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dob: "",
    email: "",
    dietaryStyle: "",
    allergies: "",
    dislikes: "",
    favoriteCuisines: "",
    cookingGoal: "",
    maxCookTime: "",
    householdSize: 1,
  });
  const [editingKey, setEditingKey] = useState(null);
  const [draftValue, setDraftValue] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const storedRaw = localStorage.getItem("user");
    if (storedRaw) {
      try {
        const stored = JSON.parse(storedRaw);
        const fromStorage = clientUserToFormData(stored);
        if (fromStorage) {
          setFormData(fromStorage);
        }
      } catch {
        /* ignore bad cache */
      }
    }

    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("http://localhost:5050/me", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const raw = await res.text();
        let data = {};
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error("Invalid response from server.");
        }
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            navigate("/login", { replace: true });
            return;
          }
          throw new Error(data.error || "Could not load your profile.");
        }
        const u = data.user;
        if (cancelled) return;
        if (!u) {
          setError("Could not load profile from the server. Showing saved data if any.");
          return;
        }
        setFormData(clientUserToFormData(u));
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Failed to load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const persist = useCallback(
    async (data) => {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", { replace: true });
        return false;
      }

      setError("");
      setSuccess("");
      setSaving(true);
      try {
        const res = await fetch("http://localhost:5050/me", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            firstName: data.firstName,
            lastName: data.lastName,
            dob: data.dob,
            email: data.email,
            dietaryStyle: data.dietaryStyle,
            allergies: data.allergies,
            dislikes: data.dislikes,
            favoriteCuisines: data.favoriteCuisines,
            cookingGoal: data.cookingGoal,
            maxCookTime: data.maxCookTime,
            householdSize: (() => {
              const n = Number(data.householdSize);
              return Number.isFinite(n) && n >= 1 ? n : 1;
            })(),
          }),
        });

        const raw = await res.text();
        let payload = {};
        try {
          payload = raw ? JSON.parse(raw) : {};
        } catch {
          throw new Error("Invalid response from server.");
        }

        if (!res.ok) {
          throw new Error(payload.error || "Failed to save changes.");
        }

        if (payload.token) {
          localStorage.setItem("token", payload.token);
        }
        if (payload.user) {
          localStorage.setItem("user", JSON.stringify(payload.user));
          const synced = clientUserToFormData(payload.user);
          if (synced) {
            setFormData(synced);
          }
        }

        setSuccess("Saved.");
        setTimeout(() => setSuccess(""), 2500);
        return true;
      } catch (err) {
        setError(err.message || "Something went wrong.");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [navigate]
  );

  const patchPreferences = async (partial) => {
    const previous = { ...formData };
    const next = { ...formData, ...partial };
    setFormData(next);
    const ok = await persist(next);
    if (!ok) {
      setFormData(previous);
    }
  };

  const openEdit = (key) => {
    setError("");
    setSuccess("");
    setEditingKey(key);
    const v = formData[key];
    if (key === "householdSize") {
      setDraftValue(String(v ?? 1));
    } else {
      setDraftValue(v != null ? String(v) : "");
    }
  };

  const cancelEdit = () => {
    setEditingKey(null);
    setDraftValue("");
  };

  const saveEdit = async () => {
    if (!editingKey) return;

    const previous = { ...formData };
    const next = { ...formData };
    if (editingKey === "householdSize") {
      const n = Number(draftValue);
      next.householdSize = Number.isNaN(n) || n < 1 ? 1 : Math.min(12, n);
    } else {
      next[editingKey] = draftValue;
    }

    setFormData(next);
    setEditingKey(null);
    setDraftValue("");
    const ok = await persist(next);
    if (!ok) {
      setFormData(previous);
    }
  };

  const handleDraftChange = (e) => {
    setDraftValue(e.target.value);
  };

  if (loading) {
    return (
      <main className="page">
        <p className="section-text">Loading your account…</p>
      </main>
    );
  }

  const isEditing = (key) => editingKey === key;

  return (
    <main className="page">
      <section className="hero">
        <div className="hero-text">
          <h1>Account and preferences</h1>
          <p className="section-text">
            Identity fields use tap-to-edit. Your cooking targets below work like a
            fitness app — tap a chip and we save right away.
          </p>

          {error && (
            <p className="account-message account-message--error" role="alert">
              {error}
            </p>
          )}
          {success && (
            <p className="account-message account-message--success">{success}</p>
          )}

          <div className="profile-card profile-card--prefs-fitness">
            <div className="prefs-fitness-header">
              <p className="prefs-fitness-kicker">Your account</p>
              <h2 className="prefs-fitness-title">Profile & contact</h2>
              <p className="prefs-fitness-lead">
                Tap a row to edit that field, then Save or Cancel — same rhythm as
                updating stats in a training app.
              </p>
            </div>

            {!isEditing("firstName") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("firstName")}
              >
                <span className="profile-row__label">First name</span>
                <span className="profile-row__value">
                  {displayText(formData.firstName)}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">First name</span>
                <input
                  className="profile-row__input"
                  value={draftValue}
                  onChange={handleDraftChange}
                  autoFocus
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving || !draftValue.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isEditing("lastName") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("lastName")}
              >
                <span className="profile-row__label">Last name</span>
                <span className="profile-row__value">
                  {displayText(formData.lastName)}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Last name</span>
                <input
                  className="profile-row__input"
                  value={draftValue}
                  onChange={handleDraftChange}
                  autoFocus
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving || !draftValue.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isEditing("dob") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("dob")}
              >
                <span className="profile-row__label">Date of birth</span>
                <span className="profile-row__value">
                  {formatDobDisplay(formData.dob)}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Date of birth</span>
                <input
                  type="date"
                  className="profile-row__input"
                  value={draftValue}
                  onChange={handleDraftChange}
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving || !draftValue}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isEditing("email") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("email")}
              >
                <span className="profile-row__label">Email</span>
                <span className="profile-row__value">
                  {displayText(formData.email)}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Email</span>
                <input
                  type="email"
                  className="profile-row__input"
                  value={draftValue}
                  onChange={handleDraftChange}
                  autoFocus
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving || !draftValue.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="profile-card profile-card--prefs-fitness">
            <div className="prefs-fitness-header">
              <p className="prefs-fitness-kicker">Your cooking profile</p>
              <h2 className="prefs-fitness-title">Tastes & rhythm</h2>
              <p className="prefs-fitness-lead">
                Tap a chip to update your plan. Changes save immediately.
              </p>
            </div>

            <section className="pref-panel">
              <h3 className="pref-panel__title">Typical cook window</h3>
              <p className="pref-panel__hint">
                Match recipes to the time you usually have, not a single minute
                countdown.
              </p>
              <div className="pref-chip-grid pref-chip-grid--tight">
                {COOK_TIME_SELECTABLE.map((opt) => (
                  <button
                    key={opt.value || "none"}
                    type="button"
                    disabled={saving}
                    className={`pref-chip${
                      (formData.maxCookTime || "") === (opt.value ?? "")
                        ? " pref-chip--active"
                        : ""
                    }`}
                    onClick={() => patchPreferences({ maxCookTime: opt.value })}
                  >
                    <span className="pref-chip__label">{opt.label}</span>
                    {opt.hint ? (
                      <span className="pref-chip__hint">{opt.hint}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </section>

            <section className="pref-panel">
              <h3 className="pref-panel__title">Eating style</h3>
              <p className="pref-panel__hint">What should recipes respect first?</p>
              <div className="pref-chip-grid">
                {DIETARY_STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || "unset"}
                    type="button"
                    disabled={saving}
                    className={`pref-chip pref-chip--compact${
                      formData.dietaryStyle === opt.value
                        ? " pref-chip--active"
                        : ""
                    }`}
                    onClick={() => patchPreferences({ dietaryStyle: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="pref-panel">
              <h3 className="pref-panel__title">Kitchen focus</h3>
              <p className="pref-panel__hint">What a good week of meals looks like for you.</p>
              <div className="pref-chip-grid">
                {COOKING_GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value || "unset-goal"}
                    type="button"
                    disabled={saving}
                    className={`pref-chip pref-chip--compact${
                      formData.cookingGoal === opt.value ? " pref-chip--active" : ""
                    }`}
                    onClick={() => patchPreferences({ cookingGoal: opt.value })}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </section>

            <h3 className="pref-panel__title pref-panel__title--details">Lists & household</h3>
            <p className="pref-panel__hint pref-panel__hint--details">
              Tap a row to edit — same as your profile above.
            </p>

            {!isEditing("allergies") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("allergies")}
              >
                <span className="profile-row__label">Allergies</span>
                <span className="profile-row__value">
                  {displayText(formData.allergies, "None listed")}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Allergies</span>
                <input
                  className="profile-row__input"
                  placeholder="Comma separated"
                  value={draftValue}
                  onChange={handleDraftChange}
                  autoFocus
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isEditing("dislikes") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("dislikes")}
              >
                <span className="profile-row__label">Disliked ingredients</span>
                <span className="profile-row__value">
                  {displayText(formData.dislikes, "None listed")}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Disliked ingredients</span>
                <input
                  className="profile-row__input"
                  placeholder="Comma separated"
                  value={draftValue}
                  onChange={handleDraftChange}
                  autoFocus
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isEditing("favoriteCuisines") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("favoriteCuisines")}
              >
                <span className="profile-row__label">Favorite cuisines</span>
                <span className="profile-row__value">
                  {displayText(formData.favoriteCuisines, "None listed")}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Favorite cuisines</span>
                <input
                  className="profile-row__input"
                  placeholder="Comma separated"
                  value={draftValue}
                  onChange={handleDraftChange}
                  autoFocus
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {!isEditing("householdSize") ? (
              <button
                type="button"
                className="profile-row"
                onClick={() => openEdit("householdSize")}
              >
                <span className="profile-row__label">Household size</span>
                <span className="profile-row__value">
                  {formData.householdSize != null
                    ? String(formData.householdSize)
                    : "—"}
                </span>
                <span className="profile-row__chev" aria-hidden>
                  ›
                </span>
              </button>
            ) : (
              <div className="profile-row profile-row--editing">
                <span className="profile-row__label">Household size</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  className="profile-row__input"
                  value={draftValue}
                  onChange={handleDraftChange}
                />
                <div className="profile-row__actions">
                  <button
                    type="button"
                    className="profile-row__btn profile-row__btn--primary"
                    onClick={saveEdit}
                    disabled={saving}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="profile-row__btn"
                    onClick={cancelEdit}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
