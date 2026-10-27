# NutriGenius 🥗
> **Understand Your Food. Make Better Choices.**

NutriGenius is a personal food intelligence platform that helps users analyze packaged food products, compare nutritional values, discover healthy recipes, investigate fruit chemistry, track daily dietary intake, and plan balanced meals according to their goals and preferences.

---

## 1. Project Overview

NutriGenius is built as a modular full-stack application for students, researchers, and consumers who want transparency in food nutrition. The application combines live external food APIs (Open Food Facts, TheMealDB, Fruityvice, Spoonacular) with custom client-side and server-side algorithms for portion scaling, nutritional comparison ranking, and ingredient match scoring.

---

## 2. Main Features

* **Packaged Food Analyzer (Open Food Facts)**: Enter an EAN/UPC barcode or search by name to retrieve Nutri-Score, ingredients, additives, allergens, and scalable per-serving nutrient quantities.
* **Product Comparison Tool**: Side-by-side nutritional evaluation on a normalized 100g basis with custom priority weighting (e.g. low sugar, high protein, low calories, low fat).
* **Culinary Recipe Finder (TheMealDB)**: Search global culinary dishes by dish title or available pantry ingredients with step-by-step cooking instructions and video tutorials.
* **Fruit Taxonomy & Nutrition (Fruityvice)**: Explore botanical genus, families, calories, and sugar profiles for raw fruits with instant logging.
* **Daily Nutrition Tracker**: Log daily meals and track running calories, protein, carbs, and fat against recommended daily intake goals with Chart.js visualization.
* **Personalized Meal Planner**: Algorithm-driven daily meal generator balancing caloric goals, dietary preferences, and ingredient exclusions.
* **Supabase Cloud Persistence**: User authentication, profiles, saved foods, and daily logs protected by Row Level Security (RLS) with instant local demo mode fallback.

---

## 3. Technology Stack

* **Frontend**: HTML5, Modern CSS3 (CSS Variables, Flexbox/Grid, Responsive Design), Vanilla JavaScript (ES6+ Classes & Fetch API), Chart.js (v4).
* **Backend**: Node.js (v18+ or v24+), Express.js, In-memory Sliding Window Rate Limiting, Centralized Error Handling, CORS.
* **Database & Auth**: Supabase PostgreSQL, Row Level Security (RLS), Supabase Auth.
* **Testing**: Built-in Node.js Test Runner (`node:test`, `node:assert`).

---

## 4. Architecture & Design Principles

* **Decoupled Client & Server**: Frontend communicates strictly with the Express backend, keeping API secrets secure and handling rate-limiting centrally.
* **Zero Fabrication Principle**: If an external API lacks a nutrient value, the application displays "Unavailable" rather than falsely defaulting to `0`.
* **Explainable Algorithms**: No misleading AI buzzwords—all scoring models (ingredient overlap, comparison scoring, portion calculators) are deterministic and explainable.

---

## 5. Folder Structure

```
NutriGenius-AI/
├── backend/
│   ├── middleware/
│   │   ├── auth.js               # Supabase JWT & demo authentication handler
│   │   ├── errorHandler.js       # Centralized error formatter
│   │   └── rateLimiter.js        # In-memory sliding-window rate limiter
│   ├── routes/
│   │   ├── foodRoutes.js         # Open Food Facts endpoints
│   │   ├── fruitRoutes.js        # Fruityvice endpoints
│   │   ├── mealPlanRoutes.js     # Meal planner endpoints
│   │   ├── nutritionRoutes.js    # Nutrition tracker endpoints
│   │   └── recipeRoutes.js       # TheMealDB endpoints
│   ├── services/
│   │   ├── fruityvice.js         # Fruityvice client service
│   │   ├── mealDb.js             # TheMealDB client service
│   │   ├── openFoodFacts.js      # Open Food Facts client service
│   │   ├── spoonacular.js        # Optional Spoonacular service
│   │   └── supabaseClient.js     # Supabase client service
│   ├── utils/
│   │   ├── nutritionCalculations.js  # Portion math & macro distributions
│   │   ├── rankingAlgorithms.js      # Comparison & meal planning heuristics
│   │   └── validators.js             # Barcode & query sanitization
│   ├── .env                      # Local environment configuration
│   ├── .env.example              # Environment variables template
│   ├── package.json              # Backend dependencies and scripts
│   └── server.js                 # Express server entry point
├── database/
│   ├── schema.sql                # Complete Supabase PostgreSQL schema with RLS
│   └── seed.sql                  # Safe sample demo records
├── frontend/
│   ├── assets/                   # Images and icons
│   ├── css/
│   │   ├── auth.css              # Styling for login & register views
│   │   └── style.css             # Main design system & responsive layout
│   ├── js/
│   │   ├── api.js                # Centralized frontend API service
│   │   ├── app.js                # Main view router & health check monitor
│   │   ├── auth.js               # User auth controller & demo login
│   │   ├── comparison.js         # Comparison logic
│   │   ├── config.js             # Client configuration
│   │   ├── dashboard.js          # Dashboard metrics & Chart.js integration
│   │   ├── food.js               # Food analyzer controller
│   │   ├── fruits.js             # Fruit nutrition explorer
│   │   ├── mealPlanner.js        # Meal planner controller
│   │   ├── nutrition.js          # Daily food log controller
│   │   └── recipes.js            # Recipe search controller
│   ├── index.html                # Main single-page application dashboard
│   ├── login.html                # User login page
│   └── register.html             # User registration page
├── tests/
│   ├── algorithms.test.js        # Stage 5 algorithm tests
│   ├── stage1.test.js            # Stage 1 foundation test suite
│   ├── stage2.test.js            # Stage 2 Open Food Facts test suite
│   ├── stage3.test.js            # Stage 3 TheMealDB test suite
│   ├── stage4.test.js            # Stage 4 Fruityvice test suite
│   ├── stage6_7.test.js          # Stage 6, 7 & 9 nutrition & planner tests
│   └── README.md                 # Test suite documentation
├── .gitignore
└── README.md
```

---

## 6. Required Software

1. **Node.js**: v18.0.0 or higher (Node v24 recommended)
2. **npm**: v9.0.0 or higher
3. **Web Browser**: Chrome, Edge, Firefox, or Safari
4. **VS Code** (Live Server extension recommended for serving frontend)

---

## 7. Installation & Setup Instructions

### Step 1: Open the Project
Open VS Code and set the workspace folder to:
```
C:\Users\DIRGH\.gemini\antigravity\scratch\NutriGenius-AI
```

### Step 2: Install Backend Dependencies
Open a terminal in the `backend` directory:
```bash
cd backend
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
*(On Windows PowerShell, use: `Copy-Item .env.example .env`)*

---

## 8. Running the Application

Running NutriGenius AI requires two components: the Express backend and the frontend.

### Terminal 1: Start the Backend Server
From the `backend` directory:
```bash
npm start
```
*Or run in watch mode for development:*
```bash
npm run dev
```
The backend will start at: **`http://localhost:3000`**

### Terminal 2: Run the Frontend
You can serve the `frontend` folder using any static web server:

**Option A: Using Python (Built into Windows/macOS/Linux):**
```bash
cd frontend
python -m http.server 5500
```
Then visit: **`http://localhost:5500`**

**Option B: Using Node's `npx serve`:**
```bash
cd frontend
npx serve -l 5500
```

**Option C: VS Code Live Server Extension:**
Right-click `frontend/index.html` in VS Code and click **"Open with Live Server"**.

---

## 9. Testing the Backend

### Health Check Endpoint
Open your browser or run curl to test the backend:
```bash
curl http://localhost:3000/api/health
```
**Expected Response:**
```json
{
  "status": "OK",
  "message": "NutriGenius backend is working",
  "timestamp": "2026-10-27T...",
  "uptimeSeconds": 12,
  "environment": "development"
}
```

### Running Automated Unit Tests
From the `backend` directory:
```bash
npm test
```
Or from the project root:
```bash
node --test tests/**/*.test.js
```
*Current test suite: 21 tests covering health checks, barcode validation, product normalization, recipe extraction, fruit taxonomy, nutrition calculations, comparison scoring, ingredient matching, and optional service degradation.*

---

## 10. Database Setup (Supabase)

When you are ready to persist data to the cloud:
1. Create a free project at [supabase.com](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `database/schema.sql` and click **Run**.
4. Retrieve your **Project URL** and **Anon Public Key** from **Project Settings > API**.
5. Add them to `backend/.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

*Note: Even before Supabase credentials are configured, the application functions in local demo mode, storing data in memory and browser storage.*

---

## 11. Custom Algorithm Implementations

* **Portion Scaling Calculator (`backend/utils/nutritionCalculations.js`)**: Scales 100g/100ml nutrient baselines to custom portion weights, flagging unavailable fields as `null` to uphold the zero-fabrication principle.
* **Comparison Scoring Engine (`backend/utils/rankingAlgorithms.js`)**: Evaluates products against user-selected health priorities (`balanced`, `low_sugar`, `high_protein`, `low_calories`, `low_fat`), generating explainable advantage scores.
* **Ingredient Overlap Matcher (`backend/utils/rankingAlgorithms.js`)**: Matches user pantry ingredients against recipe required ingredients, flagging missing items and warning if avoided allergens are detected.
* **Meal Plan Generator (`backend/routes/mealPlanRoutes.js`)**: Structures daily meals based on caloric goals, dietary preferences (vegetarian, low-carb, balanced), and heuristic ranking scores.

---

## 12. Security & Compliance Notes

* **API Key Protection**: External credentials reside strictly in `backend/.env` and are never exposed in browser bundles.
* **Rate Limiting**: Sliding-window rate limiter prevents abuse (150 requests/min per IP).
* **Row Level Security (RLS)**: Enforced on all Supabase tables, guaranteeing data isolation between users.
* **API Attribution**: Properly credits Open Food Facts, TheMealDB, and Fruityvice in compliance with their documentation terms.
