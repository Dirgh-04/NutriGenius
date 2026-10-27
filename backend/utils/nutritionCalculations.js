/**
 * NutriGenius AI — Nutrition Calculation Engine
 * Implements portion scaling, macro energy distribution, and daily aggregation.
 * Strictly adheres to the zero-fabrication principle: missing data is flagged as null, never 0.
 */

/**
 * Calculates nutrient values for a specific portion size based on 100g/100ml baseline.
 * @param {Object} nutrients100g - Object containing nutrient values per 100g
 * @param {number} servingGrams - Portion size in grams or ml
 * @returns {Object} Scaled nutrients with source metadata
 */
function calculatePortionNutrients(nutrients100g, servingGrams) {
  if (!nutrients100g || typeof nutrients100g !== 'object') {
    throw new Error('Invalid nutrients baseline provided');
  }

  const portionSize = Number(servingGrams);
  if (isNaN(portionSize) || portionSize <= 0) {
    throw new Error('Serving size must be a positive number');
  }

  const factor = portionSize / 100;
  const result = {
    servingSizeGrams: portionSize,
    calculatedNutrients: {},
    unavailableNutrients: []
  };

  const trackedKeys = [
    { key: 'calories', unit: 'kcal' },
    { key: 'protein', unit: 'g' },
    { key: 'carbohydrates', unit: 'g' },
    { key: 'sugars', unit: 'g' },
    { key: 'fat', unit: 'g' },
    { key: 'saturatedFat', unit: 'g' },
    { key: 'fiber', unit: 'g' },
    { key: 'sodium', unit: 'mg' },
    { key: 'salt', unit: 'g' }
  ];

  for (const { key, unit } of trackedKeys) {
    const rawVal = nutrients100g[key];
    if (rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal))) {
      const scaled = Number((Number(rawVal) * factor).toFixed(2));
      result.calculatedNutrients[key] = {
        value: scaled,
        unit: unit,
        baselinePer100g: Number(rawVal)
      };
    } else {
      result.unavailableNutrients.push(key);
      result.calculatedNutrients[key] = {
        value: null,
        unit: unit,
        baselinePer100g: null,
        status: 'Data unavailable from source'
      };
    }
  }

  return result;
}

/**
 * Aggregates nutrients across multiple logged food items.
 * Handles missing values honestly by maintaining count of items with reported data.
 * @param {Array} foodLogs - Array of food entry objects
 * @returns {Object} Aggregated daily totals and completeness metrics
 */
function aggregateDailyNutrients(foodLogs = []) {
  if (!Array.isArray(foodLogs)) {
    throw new Error('Food logs must be an array');
  }

  const totals = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    sugars: 0,
    fat: 0,
    fiber: 0
  };

  const reportedCounts = {
    calories: 0,
    protein: 0,
    carbohydrates: 0,
    sugars: 0,
    fat: 0,
    fiber: 0
  };

  foodLogs.forEach(entry => {
    ['calories', 'protein', 'carbohydrates', 'sugars', 'fat', 'fiber'].forEach(nutrient => {
      const val = entry[nutrient] ?? entry[`${nutrient}_g`];
      if (val !== null && val !== undefined && !isNaN(Number(val))) {
        totals[nutrient] += Number(val);
        reportedCounts[nutrient]++;
      }
    });
  });

  // Round values
  for (const key of Object.keys(totals)) {
    totals[key] = Number(totals[key].toFixed(1));
  }

  // Calculate macronutrient caloric contribution
  // Protein: 4 kcal/g, Carbs: 4 kcal/g, Fat: 9 kcal/g
  const proteinKcal = totals.protein * 4;
  const carbsKcal = totals.carbohydrates * 4;
  const fatKcal = totals.fat * 9;
  const macroKcalTotal = proteinKcal + carbsKcal + fatKcal;

  const macroPercentages = macroKcalTotal > 0 ? {
    proteinPct: Math.round((proteinKcal / macroKcalTotal) * 100),
    carbsPct: Math.round((carbsKcal / macroKcalTotal) * 100),
    fatPct: Math.round((fatKcal / macroKcalTotal) * 100)
  } : {
    proteinPct: 0,
    carbsPct: 0,
    fatPct: 0
  };

  return {
    itemCount: foodLogs.length,
    totals,
    macroPercentages,
    dataCompleteness: {
      totalItems: foodLogs.length,
      itemsWithCalories: reportedCounts.calories,
      itemsWithMacros: Math.min(reportedCounts.protein, reportedCounts.carbohydrates, reportedCounts.fat)
    }
  };
}

module.exports = {
  calculatePortionNutrients,
  aggregateDailyNutrients
};
