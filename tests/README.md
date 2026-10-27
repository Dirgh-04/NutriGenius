# NutriGenius AI — Automated Test Suite

This directory contains deterministic unit and integration tests for NutriGenius AI.

## Running Tests

All tests are implemented using Node.js's built-in test runner (`node:test` and `node:assert`), requiring no third-party test framework overhead.

To run all tests:
```bash
# From the root directory:
node --test tests/**/*.test.js

# Or using npm from inside the backend directory:
cd backend
npm test
```

## Test Suites & Coverage

* **Stage 1 (`tests/stage1.test.js`)**:
  - Express Health-check endpoint `GET /api/health`
  - Sub-router mounting (`/api/food`, `/api/recipes`, `/api/fruits`, `/api/nutrition`, `/api/meal-plans`)
  - 404 JSON fallback handling
* **Stage 2 (`tests/stage2.test.js`)**:
  - Barcode format validation (EAN-8, UPC-A, EAN-13, EAN-14)
  - Open Food Facts normalization with zero-fabrication guarantees
  - Portion calculation endpoint (`POST /api/food/calculate-portion`)
* **Stage 3 (`tests/stage3.test.js`)**:
  - TheMealDB recipe ingredient/measurement cleaning & pairing
  - Recipe search parameter validation
  - Non-numeric recipe ID error handling
* **Stage 4 (`tests/stage4.test.js`)**:
  - Fruityvice fruit normalization & taxonomy mapping
  - Fruit comparison parameter validation
* **Stage 5 (`tests/algorithms.test.js`)**:
  - Portion scaling math & unavailable nutrient detection
  - Daily nutrition aggregation & macro caloric percentage breakdown
  - Comparison ranking priority weighting (low sugar, high protein)
  - Ingredient match percentage, missing items, and allergen caution flagging
* **Stage 6 & 7 & 9 (`tests/stage6_7.test.js`)**:
  - Nutrition comparator endpoint (`POST /api/nutrition/compare`)
  - Full food log lifecycle (POST log -> GET logs -> aggregated summary)
  - Meal planner calorie boundary validation
  - Optional Spoonacular service graceful degradation
