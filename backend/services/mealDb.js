/**
 * NutriGenius AI — TheMealDB API Service
 * Documentation: https://www.themealdb.com/api.php
 */

const BASE_URL = process.env.THEMEALDB_BASE_URL || 'https://www.themealdb.com/api/json/v1/1';
const TIMEOUT_MS = 10000;

/**
 * Normalizes a raw meal record from TheMealDB into a clean NutriGenius recipe object
 */
function normalizeRecipe(meal) {
  if (!meal) return null;

  const ingredients = [];
  // TheMealDB provides up to 20 ingredient and measurement pairs
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`];
    const measure = meal[`strMeasure${i}`];

    if (ingredient && ingredient.trim()) {
      ingredients.push({
        ingredient: ingredient.trim(),
        measurement: measure ? measure.trim() : ''
      });
    }
  }

  return {
    id: meal.idMeal,
    name: meal.strMeal || 'Untitled Recipe',
    category: meal.strCategory || 'General',
    cuisine: meal.strArea || 'International',
    instructions: meal.strInstructions || '',
    thumbnail: meal.strMealThumb || null,
    youtubeUrl: meal.strYoutube || null,
    sourceUrl: meal.strSource || null,
    tags: meal.strTags ? meal.strTags.split(',').map(t => t.trim()) : [],
    ingredients,
    ingredientNames: ingredients.map(i => i.ingredient)
  };
}

/**
 * Search recipes by name/keyword
 */
async function searchRecipesByName(query) {
  const url = `${BASE_URL}/search.php?s=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TheMealDB API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const meals = data.meals || [];

    return {
      query,
      count: meals.length,
      recipes: meals.map(normalizeRecipe)
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('TheMealDB recipe search timed out.');
    }
    throw err;
  }
}

/**
 * Search recipes by main ingredient
 */
async function searchRecipesByIngredient(ingredient) {
  const url = `${BASE_URL}/filter.php?i=${encodeURIComponent(ingredient)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TheMealDB API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    const meals = data.meals || [];

    return {
      ingredient,
      count: meals.length,
      recipes: meals.map(meal => ({
        id: meal.idMeal,
        name: meal.strMeal,
        thumbnail: meal.strMealThumb
      }))
    };
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('TheMealDB ingredient search timed out.');
    }
    throw err;
  }
}

/**
 * Lookup full recipe details by ID
 */
async function getRecipeById(id) {
  const url = `${BASE_URL}/lookup.php?i=${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TheMealDB API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.meals || data.meals.length === 0) {
      return null;
    }

    return normalizeRecipe(data.meals[0]);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('TheMealDB recipe lookup timed out.');
    }
    throw err;
  }
}

module.exports = {
  searchRecipesByName,
  searchRecipesByIngredient,
  getRecipeById,
  normalizeRecipe
};
