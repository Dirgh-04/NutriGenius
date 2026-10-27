/**
 * NutriGenius AI — Spoonacular Optional Advanced Integration Service
 * Documentation: https://spoonacular.com/food-api/docs
 * 
 * NOTE: This service is strictly optional. If SPOONACULAR_API_KEY is not configured
 * or quota is exhausted, NutriGenius operates fully using TheMealDB and Fruityvice.
 */

const API_KEY = process.env.SPOONACULAR_API_KEY;
const BASE_URL = process.env.SPOONACULAR_BASE_URL || 'https://api.spoonacular.com';
const TIMEOUT_MS = 8000;

function isConfigured() {
  return Boolean(API_KEY && API_KEY.trim().length > 0);
}

/**
 * Advanced recipe search with nutrition filter (requires valid API key)
 */
async function searchRecipesWithNutrition(query, maxCalories = 800) {
  if (!isConfigured()) {
    return {
      configured: false,
      message: 'Spoonacular API key is not configured in backend/.env. Advanced nutritional recipe search is optional.'
    };
  }

  const url = `${BASE_URL}/recipes/complexSearch?query=${encodeURIComponent(query)}&maxCalories=${maxCalories}&addRecipeNutrition=true&number=10&apiKey=${API_KEY}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.status === 402) {
      return {
        configured: true,
        quotaExhausted: true,
        message: 'Spoonacular daily API request quota exceeded. Falling back to TheMealDB.'
      };
    }

    if (!response.ok) {
      throw new Error(`Spoonacular API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      configured: true,
      quotaExhausted: false,
      recipes: data.results || []
    };
  } catch (err) {
    clearTimeout(timeoutId);
    return {
      configured: true,
      error: err.message,
      message: 'Failed to contact Spoonacular. Falling back to primary services.'
    };
  }
}

module.exports = {
  isConfigured,
  searchRecipesWithNutrition
};
