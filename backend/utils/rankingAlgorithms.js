/**
 * NutriGenius AI — Ranking & Scoring Algorithms Engine
 * Contains explainable heuristic algorithms for product comparison, ingredient matching,
 * and personalized recipe suggestions.
 * 
 * NOTE: These are deterministic mathematical scoring algorithms, NOT machine learning models,
 * and do not constitute certified clinical or medical dietary advice.
 */

/**
 * Compares two food products side-by-side on a standardized 100g basis.
 * Assigns points based on user-selected priority while strictly respecting data availability.
 * 
 * @param {Object} productA - First product nutrition object
 * @param {Object} productB - Second product nutrition object
 * @param {string} priority - 'balanced' | 'low_sugar' | 'high_protein' | 'low_calories' | 'low_fat'
 * @returns {Object} Comprehensive evaluation score, breakdown, and limitations explanation
 */
function calculateComparisonScore(productA, productB, priority = 'balanced') {
  if (!productA || !productB) {
    throw new Error('Both products must be provided for comparison');
  }

  // Weight configurations for different health objectives
  const priorityWeights = {
    balanced:     { protein: 1.5, sugar: -1.5, fiber: 1.2, saturatedFat: -1.0, calories: -0.5 },
    low_sugar:    { protein: 1.0, sugar: -3.0, fiber: 1.0, saturatedFat: -1.0, calories: -1.0 },
    high_protein: { protein: 3.0, sugar: -1.0, fiber: 1.0, saturatedFat: -1.0, calories: 0.0 },
    low_calories: { protein: 1.0, sugar: -1.5, fiber: 1.0, saturatedFat: -1.0, calories: -2.5 },
    low_fat:      { protein: 1.0, sugar: -1.0, fiber: 1.0, saturatedFat: -3.0, calories: -1.5 }
  };

  const weights = priorityWeights[priority] || priorityWeights.balanced;

  let scoreA = 0;
  let scoreB = 0;
  const metricsEvaluated = [];
  const metricsUnavailable = [];

  const metrics = [
    { key: 'protein', name: 'Protein', unit: 'g' },
    { key: 'sugar', name: 'Sugars', unit: 'g', altKey: 'sugars' },
    { key: 'fiber', name: 'Fiber', unit: 'g' },
    { key: 'saturatedFat', name: 'Saturated Fat', unit: 'g' },
    { key: 'calories', name: 'Calories', unit: 'kcal' }
  ];

  for (const m of metrics) {
    const valA = productA[m.key] ?? productA[m.altKey];
    const valB = productB[m.key] ?? productB[m.altKey];

    const hasA = valA !== null && valA !== undefined && !isNaN(Number(valA));
    const hasB = valB !== null && valB !== undefined && !isNaN(Number(valB));

    if (hasA && hasB) {
      const numA = Number(valA);
      const numB = Number(valB);
      const diff = numA - numB;
      const weight = weights[m.key] || 1;

      // Positive diff * positive weight favors A; negative weight favors lower value (e.g. sugar)
      const contribution = diff * weight;

      if (contribution > 0) {
        scoreA += Math.abs(contribution);
      } else if (contribution < 0) {
        scoreB += Math.abs(contribution);
      }

      metricsEvaluated.push({
        metric: m.name,
        unit: m.unit,
        productAValue: numA,
        productBValue: numB,
        difference: Number((numA - numB).toFixed(2)),
        weight: weight,
        advocate: contribution > 0 ? 'productA' : contribution < 0 ? 'productB' : 'neutral'
      });
    } else {
      metricsUnavailable.push({
        metric: m.name,
        availableInA: hasA,
        availableInB: hasB,
        note: 'Excluded from scoring to prevent unfair bias against missing data'
      });
    }
  }

  scoreA = Number(scoreA.toFixed(2));
  scoreB = Number(scoreB.toFixed(2));

  let winner = 'draw';
  if (scoreA > scoreB) winner = 'productA';
  else if (scoreB > scoreA) winner = 'productB';

  const explanation = winner === 'draw'
    ? 'Both products exhibit comparable profiles based on the available metrics.'
    : `${winner === 'productA' ? (productA.name || 'Product A') : (productB.name || 'Product B')} scored higher under the "${priority.replace('_', ' ')}" priority profile.`;

  return {
    prioritySelected: priority,
    productAName: productA.name || 'Product A',
    productBName: productB.name || 'Product B',
    scoreA,
    scoreB,
    winner,
    explanation,
    metricsEvaluated,
    metricsUnavailable,
    disclaimer: 'This comparison ranking is a mathematical heuristic comparing reported 100g values under your selected objective. It does not replace clinical or nutritional counseling.'
  };
}

/**
 * Helper to safely extract and lowercase an ingredient name from string or object
 */
function extractIngredientName(item) {
  if (!item) return '';
  if (typeof item === 'string') return item.toLowerCase().trim();
  if (typeof item === 'object') {
    if (typeof item.ingredient === 'string') return item.ingredient.toLowerCase().trim();
    if (typeof item.name === 'string') return item.name.toLowerCase().trim();
  }
  return String(item).toLowerCase().trim();
}

/**
 * Calculates ingredient overlap between user's available pantry ingredients and a recipe's ingredient list.
 * Identifies matches, missing items, and highlights any avoided ingredients.
 * 
 * @param {Array} userPantry - Ingredients the user has on hand
 * @param {Array} avoidedIngredients - Ingredients the user wishes to avoid (allergens/dislikes)
 * @param {Array} recipeIngredients - Ingredients required by the recipe (strings or objects)
 * @returns {Object} Match percentage, itemized lists, and dietary safety alert
 */
function calculateIngredientMatch(userPantry = [], avoidedIngredients = [], recipeIngredients = []) {
  const pantrySet = (userPantry || []).map(extractIngredientName).filter(Boolean);
  const avoidSet = (avoidedIngredients || []).map(extractIngredientName).filter(Boolean);
  const recipeList = (recipeIngredients || []).map(extractIngredientName).filter(Boolean);

  if (recipeList.length === 0) {
    return {
      recipeTotalIngredients: 0,
      matchPercentage: 0,
      matchedIngredients: [],
      missingIngredients: [],
      avoidedIngredientsFound: [],
      containsAvoided: false,
      safetyWarning: false
    };
  }

  const matched = [];
  const missing = [];
  const avoidedMatches = [];

  recipeList.forEach(item => {
    // Check if ingredient matches avoided list
    const isAvoided = avoidSet.some(avoid => item.includes(avoid) || avoid.includes(item));
    if (isAvoided) {
      avoidedMatches.push(item);
    }

    // Check if in pantry
    const inPantry = pantrySet.some(p => item.includes(p) || p.includes(item));
    if (inPantry) {
      matched.push(item);
    } else {
      missing.push(item);
    }
  });

  const matchPercentage = Math.round((matched.length / recipeList.length) * 100);

  return {
    recipeTotalIngredients: recipeList.length,
    matchPercentage,
    matchedIngredients: matched,
    missingIngredients: missing,
    avoidedIngredientsFound: avoidedMatches,
    containsAvoided: avoidedMatches.length > 0,
    disclaimer: 'Ingredient matching is based on substring text analysis. Always manually verify package labels for cross-contamination or hidden allergens.'
  };
}

/**
 * Filters and ranks recipes according to user dietary preferences and available ingredients.
 * 
 * @param {Array} recipes - List of recipe objects from TheMealDB
 * @param {Object} preferences - User preferences { dietary, pantryIngredients, avoidedIngredients }
 * @returns {Array} Sorted and scored recipes with justification notes
 */
function rankRecipes(recipes = [], preferences = {}) {
  const { dietary = 'balanced', pantryIngredients = [], avoidedIngredients = [] } = preferences;

  const vegetarianKeywords = ['vegetable', 'vegan', 'salad', 'bean', 'lentil', 'rice', 'cheese', 'tofu', 'paneer', 'spinach', 'chickpea'];
  const nonVegKeywords = ['chicken', 'beef', 'pork', 'lamb', 'bacon', 'meat', 'fish', 'salmon', 'prawn', 'shrimp', 'tuna'];

  return (recipes || []).map(recipe => {
    let score = 50; // baseline
    const tags = [];

    const recipeName = String(recipe.strMeal || recipe.name || '').toLowerCase();
    const recipeCategory = String(recipe.strCategory || recipe.category || '').toLowerCase();
    const rawIngredients = recipe.ingredientNames || recipe.ingredients || [];
    const ingredients = rawIngredients.map(extractIngredientName).filter(Boolean);

    // 1. Dietary Preference Check
    if (dietary === 'vegetarian') {
      const containsMeat = nonVegKeywords.some(kw => 
        recipeName.includes(kw) || recipeCategory.includes(kw) || ingredients.some(i => i.includes(kw))
      );
      if (containsMeat) {
        score -= 40;
        tags.push('May contain meat');
      } else {
        score += 25;
        tags.push('Vegetarian friendly');
      }
    } else if (dietary === 'low-carb') {
      const highCarbKeywords = ['pasta', 'rice', 'bread', 'potato', 'sugar', 'flour', 'noodle'];
      const hasCarb = highCarbKeywords.some(kw => recipeName.includes(kw) || ingredients.some(i => i.includes(kw)));
      if (hasCarb) {
        score -= 20;
      } else {
        score += 20;
        tags.push('Lower carb option');
      }
    }

    // 2. Ingredient Overlap Score
    const matchAnalysis = calculateIngredientMatch(pantryIngredients, avoidedIngredients, rawIngredients);
    score += (matchAnalysis.matchPercentage * 0.3); // max +30 points

    if (matchAnalysis.containsAvoided) {
      score -= 50;
      tags.push(`Contains avoided ingredient: ${matchAnalysis.avoidedIngredientsFound.join(', ')}`);
    }

    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return {
      ...recipe,
      rankingScore: finalScore,
      matchPercentage: matchAnalysis.matchPercentage,
      matchedIngredients: matchAnalysis.matchedIngredients,
      missingIngredients: matchAnalysis.missingIngredients,
      containsAvoided: matchAnalysis.containsAvoided,
      reasons: tags
    };
  }).sort((a, b) => b.rankingScore - a.rankingScore);
}

module.exports = {
  calculateComparisonScore,
  calculateIngredientMatch,
  rankRecipes
};
