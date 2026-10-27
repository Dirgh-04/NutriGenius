/**
 * NutriGenius AI — Fruityvice API Service
 * Documentation: https://fruityvice.com/
 */

const BASE_URL = process.env.FRUITYVICE_BASE_URL || 'https://www.fruityvice.com';
const TIMEOUT_MS = 10000;

/**
 * Normalizes raw Fruityvice fruit object
 */
function normalizeFruit(fruit) {
  if (!fruit) return null;

  const nutritions = fruit.nutritions || {};

  return {
    id: fruit.id,
    name: fruit.name || 'Unknown Fruit',
    family: fruit.family || 'Unspecified',
    order: fruit.order || 'Unspecified',
    genus: fruit.genus || 'Unspecified',
    nutrients100g: {
      calories: nutritions.calories !== undefined ? Number(nutritions.calories) : null,
      carbohydrates: nutritions.carbohydrates !== undefined ? Number(nutritions.carbohydrates) : null,
      protein: nutritions.protein !== undefined ? Number(nutritions.protein) : null,
      fat: nutritions.fat !== undefined ? Number(nutritions.fat) : null,
      sugar: nutritions.sugar !== undefined ? Number(nutritions.sugar) : null
    },
    units: {
      calories: 'kcal',
      carbohydrates: 'g',
      protein: 'g',
      fat: 'g',
      sugar: 'g',
      basis: '100g raw fruit'
    },
    source: 'Fruityvice'
  };
}

/**
 * Retrieve all fruits from Fruityvice
 */
async function getAllFruits() {
  const url = `${BASE_URL}/api/fruit/all`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Fruityvice API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeFruit) : [];
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Fruityvice API timed out.');
    }
    throw err;
  }
}

/**
 * Lookup a specific fruit by name
 */
async function getFruitByName(name) {
  const url = `${BASE_URL}/api/fruit/${encodeURIComponent(name.trim().toLowerCase())}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Fruityvice API error: HTTP ${response.status}`);
    }

    const data = await response.json();
    if (data.error) {
      return null;
    }

    return normalizeFruit(data);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Fruityvice API timed out.');
    }
    throw err;
  }
}

module.exports = {
  getAllFruits,
  getFruitByName,
  normalizeFruit
};
