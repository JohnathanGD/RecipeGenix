# RecipeGenix

RecipeGenix is an AI-powered recipe assistant with grocery list support, user preferences, and agent-assisted recipe generation.

## Application Overview

RecipeGenix helps users turn available ingredients into practical recipes with AI support.

Main flow:
1. User signs up/logs in and sets preferences (dietary style, cook-time window, goals).
2. User enters ingredients manually or pulls from saved grocery lists.
3. User can request clarification questions before generation.
4. AI generates multiple recipe options and evaluates them.
5. User can revise, save, and later leave feedback on saved recipes.

Core capabilities:
- Grocery list creation and management
- File-assisted ingredient extraction (`.pdf` / `.txt`)
- Multi-step AI recipe generation (clarify -> generate -> review/revise)
- Saved recipes with detail pages and feedback

## Agentic Workflow (Revision Loop)

RecipeGenix is not just a single-shot prompt. It uses an agentic, multi-step loop:

1. **Clarification Step (Optional)**
   - Before generation, the agent can ask short clarifying questions.
   - User answers are passed into the generation context.

2. **Planning + Generation**
   - A planning pass identifies constraints (diet, time, dislikes, goals).
   - A generation pass produces multiple recipe drafts.

3. **Critic/Evaluation Pass**
   - Recipes are scored and reviewed against constraints.
   - The app can auto-revise weak drafts (for example, low-score outputs).

4. **Revision Loop (Human-in-the-loop)**
   - User can request targeted revisions (e.g., cheaper, faster, vegetarian).
   - The revision agent updates the recipe while preserving compatible parts.
   - User approves/rejects pending revisions, keeping final control.

5. **Saved Feedback Loop**
   - After trying saved recipes, users add thumbs/notes.
   - That feedback is summarized and injected into future generation context.

This loop demonstrates agentic behavior through iterative planning, critique, revision, and user-guided adaptation.

## Run Instructions

### Requirements and Downloads

#### 1) Install Git (to clone the repository)
- Download: [https://git-scm.com/downloads](https://git-scm.com/downloads)
- Verify:
```bash
git --version
```

#### 2) Install Node.js and npm
- Download Node.js LTS: [https://nodejs.org](https://nodejs.org)
- npm is included with Node.js
- Verify:
```bash
node -v
npm -v
```
- Recommended: Node.js 18+ (LTS)

#### 3) Get a Gemini API key
- Google AI Studio: [https://aistudio.google.com/](https://aistudio.google.com/)
- Create an API key and place it in `server/.env` as `GEMINI_API_KEY`

### 1) Clone repository
```bash
git clone https://github.com/JohnathanGD/RecipeGenix.git
cd ai-recipe-maker
```

### 2) Install dependencies
Install frontend dependencies from project root:
```bash
npm install
```

Install backend dependencies:
```bash
cd server
npm install
cd ..
```

### 3) Configure environment variables
Create `server/.env` with:
```env
GEMINI_API_KEY=your_api_key_here
JWT_SECRET=your_jwt_secret_here
PORT=5050
```

### 4) Start backend
In one terminal:
```bash
cd server
node index.js
```
Backend runs on `http://localhost:5050`.

### 5) Start frontend
In a second terminal (from project root):
```bash
npm run dev
```
Frontend runs on Vite default (`http://localhost:5173`).

### 6) Use the app
1. Sign up or log in
2. Open Dashboard
3. Add grocery lists and/or ingredients
4. Generate and save recipes

## Notes
- Do not commit your `.env` or API keys.
- If backend route changes were made, restart the backend server.