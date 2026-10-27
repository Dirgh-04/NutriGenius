/**
 * NutriGenius AI — Open Food Facts API Service
 * Official API documentation: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * 
 * Open Food Facts maintains two API clusters:
 * 1. world.openfoodfacts.net (Optimized API server cluster for programmatic search & lookups)
 * 2. world.openfoodfacts.org (Primary web portal, may throttle search queries with HTTP 503)
 */

const USER_AGENT = process.env.OPENFOODFACTS_USER_AGENT || 'NutriGeniusAI/1.0 (dev-contact@nutrigenius.local)';
const TIMEOUT_MS = 12000;

// Host endpoints in priority order
const API_HOSTS = [
  'https://world.openfoodfacts.net',
  'https://world.openfoodfacts.org'
];

/**
 * Normalizes Open Food Facts raw product payload into a standardized, reliable NutriGenius structure.
 * Respects data integrity: missing nutrients remain null and are never fabricated as 0.
 */
function normalizeProductData(product) {
  if (!product) return null;

  const nutriments = product.nutriments || {};

  // Standardize nutrition per 100g / 100ml
  const calories = nutriments['energy-kcal_100g'] ?? nutriments['energy-kcal'] ?? null;
  const protein = nutriments['proteins_100g'] ?? nutriments['proteins'] ?? null;
  const carbohydrates = nutriments['carbohydrates_100g'] ?? nutriments['carbohydrates'] ?? null;
  const sugars = nutriments['sugars_100g'] ?? nutriments['sugars'] ?? null;
  const fat = nutriments['fat_100g'] ?? nutriments['fat'] ?? null;
  const saturatedFat = nutriments['saturated-fat_100g'] ?? nutriments['saturated-fat'] ?? null;
  const fiber = nutriments['fiber_100g'] ?? nutriments['fiber'] ?? null;
  const sodium = nutriments['sodium_100g'] ?? nutriments['sodium'] ?? null;
  const salt = nutriments['salt_100g'] ?? nutriments['salt'] ?? null;

  return {
    barcode: product.code || product._id || '',
    productName: product.product_name || product.product_name_en || product.generic_name || 'Unknown Product',
    genericName: product.generic_name || '',
    brand: product.brands || 'Unspecified Brand',
    quantity: product.quantity || '',
    servingSize: product.serving_size || '100g',
    imageUrl: product.image_url || product.image_front_url || product.image_front_small_url || null,
    nutriscoreGrade: (product.nutriscore_grade || product.nutrition_grades || '').toUpperCase() || null,
    nutriscoreScore: product.nutriscore_score !== undefined ? product.nutriscore_score : null,
    ecoscoreGrade: (product.ecoscore_grade || '').toUpperCase() || null,
    ingredientsText: product.ingredients_text || product.ingredients_text_en || 'No ingredient list provided.',
    allergens: product.allergens_tags ? product.allergens_tags.map(a => a.replace(/^[a-z]+:/, '')) : [],
    nutrients100g: {
      calories: calories !== null && !isNaN(Number(calories)) ? Number(Number(calories).toFixed(1)) : null,
      protein: protein !== null && !isNaN(Number(protein)) ? Number(Number(protein).toFixed(1)) : null,
      carbohydrates: carbohydrates !== null && !isNaN(Number(carbohydrates)) ? Number(Number(carbohydrates).toFixed(1)) : null,
      sugars: sugars !== null && !isNaN(Number(sugars)) ? Number(Number(sugars).toFixed(1)) : null,
      fat: fat !== null && !isNaN(Number(fat)) ? Number(Number(fat).toFixed(1)) : null,
      saturatedFat: saturatedFat !== null && !isNaN(Number(saturatedFat)) ? Number(Number(saturatedFat).toFixed(1)) : null,
      fiber: fiber !== null && !isNaN(Number(fiber)) ? Number(Number(fiber).toFixed(1)) : null,
      sodium: sodium !== null && !isNaN(Number(sodium)) ? Number(Number(sodium).toFixed(2)) : null,
      salt: salt !== null && !isNaN(Number(salt)) ? Number(Number(salt).toFixed(2)) : null
    },
    units: {
      calories: 'kcal',
      protein: 'g',
      carbohydrates: 'g',
      sugars: 'g',
      fat: 'g',
      saturatedFat: 'g',
      fiber: 'g',
      sodium: 'g',
      salt: 'g'
    },
    source: 'Open Food Facts'
  };
}

/**
 * Fetch helper with host fallback and timeout
 */
async function fetchWithFallback(pathGenerator) {
  let lastError = null;

  for (const host of API_HOSTS) {
    const url = pathGenerator(host);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'application/json'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        return null;
      }

      if (response.status === 503 || response.status === 429) {
        console.warn(`[Open Food Facts] Host ${host} returned HTTP ${response.status}. Trying next cluster...`);
        lastError = new Error(`Open Food Facts upstream cluster (${host}) returned status ${response.status}`);
        continue;
      }

      if (!response.ok) {
        throw new Error(`Open Food Facts HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timeoutId);
      lastError = err;
      console.warn(`[Open Food Facts] Attempt on ${host} failed: ${err.message}. Trying next host...`);
    }
  }

  throw lastError || new Error('All Open Food Facts API endpoints failed to respond.');
}

/**
 * Looks up a packaged product by its numeric barcode.
 */
async function getProductByBarcode(barcode) {
  const data = await fetchWithFallback(host => `${host}/api/v2/product/${encodeURIComponent(barcode)}.json`);
  if (!data || data.status === 0 || !data.product) {
    return null;
  }
  return normalizeProductData(data.product);
}

/**
 * Searches for packaged food products by keyword query.
 */
async function searchProducts(query, page = 1, pageSize = 20) {
  const data = await fetchWithFallback(host => 
    `${host}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${pageSize}&page=${page}`
  );

  if (!data) {
    return { query, page, pageSize, totalCount: 0, products: [] };
  }

  const rawProducts = data.products || [];
  const products = rawProducts
    .filter(p => p && (p.product_name || p.product_name_en || p.generic_name))
    .map(normalizeProductData);

  return {
    query,
    page: Number(page),
    pageSize,
    totalCount: data.count || products.length,
    products
  };
}

module.exports = {
  getProductByBarcode,
  searchProducts,
  normalizeProductData
};
