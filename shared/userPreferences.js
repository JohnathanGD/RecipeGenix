/** Cook time buckets stored in `users.max_cook_time` */
export const COOK_TIME_QUICK = "quick";
export const COOK_TIME_MID = "15-45";
export const COOK_TIME_LONG = "60-plus";

const BUCKETS = new Set([COOK_TIME_QUICK, COOK_TIME_MID, COOK_TIME_LONG]);

/**
 * Map DB value (bucket or legacy minute number) to a bucket.
 */
export function normalizeCookTimeStored(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (BUCKETS.has(s)) return s;
  const n = Number(s);
  if (Number.isFinite(n)) {
    if (n <= 15) return COOK_TIME_QUICK;
    if (n < 60) return COOK_TIME_MID;
    return COOK_TIME_LONG;
  }
  return "";
}

/** Accept signup / PATCH body and return a bucket or "". */
export function sanitizeCookTimeInput(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (BUCKETS.has(s)) return s;
  return normalizeCookTimeStored(s);
}

export function formatCookTimeForPrompt(value) {
  const v = normalizeCookTimeStored(value);
  const m = {
    [COOK_TIME_QUICK]: "Quick meal (about 15 minutes or less)",
    [COOK_TIME_MID]: "15 to 45 minutes",
    [COOK_TIME_LONG]: "60 minutes or more",
  };
  return m[v] || "Not specified";
}

export const COOK_TIME_OPTIONS = [
  {
    value: COOK_TIME_QUICK,
    label: "Quick meal",
    hint: "~15 min or less",
  },
  {
    value: COOK_TIME_MID,
    label: "15–45 mins",
    hint: "Most weeknights",
  },
  {
    value: COOK_TIME_LONG,
    label: "60+ mins",
    hint: "When you have time",
  },
];

/** Cook time chips plus optional clear (for account / signup UI). */
export const COOK_TIME_SELECTABLE = [
  { value: "", label: "No preference", hint: "" },
  ...COOK_TIME_OPTIONS,
];

export const DIETARY_STYLE_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "none", label: "No restriction" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "keto", label: "Keto" },
  { value: "halal", label: "Halal" },
  { value: "gluten-free", label: "Gluten-free" },
];

export const COOKING_GOAL_OPTIONS = [
  { value: "", label: "Not set" },
  { value: "quick-meals", label: "Quick meals" },
  { value: "high-protein", label: "High protein" },
  { value: "budget-friendly", label: "Budget friendly" },
  { value: "healthy", label: "Healthy" },
  { value: "comfort-food", label: "Comfort food" },
];

export function labelForDietary(value) {
  return (
    DIETARY_STYLE_OPTIONS.find((o) => o.value === (value || ""))?.label ??
    "Not set"
  );
}

export function labelForCookingGoal(value) {
  return (
    COOKING_GOAL_OPTIONS.find((o) => o.value === (value || ""))?.label ??
    "Not set"
  );
}

export function labelForCookTime(value) {
  const s = String(value ?? "").trim();
  if (!s) return "No preference";
  const v = normalizeCookTimeStored(s);
  return (
    COOK_TIME_OPTIONS.find((o) => o.value === v)?.label ?? "No preference"
  );
}
