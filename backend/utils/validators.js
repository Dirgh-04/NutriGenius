/**
 * NutriGenius AI — Input Validation Utilities
 */

/**
 * Validates whether an input is a valid EAN/UPC barcode.
 * Standard retail barcodes are 8, 12, 13, or 14 numeric digits.
 */
function isValidBarcode(barcode) {
  if (!barcode || typeof barcode !== 'string') return false;
  const trimmed = barcode.trim();
  // Standard barcodes: UPC-E (8), UPC-A (12), EAN-13 (13), ITF-14 (14)
  return /^\d{8,14}$/.test(trimmed);
}

/**
 * Sanitizes search queries and textual inputs to prevent injection and limit length
 */
function sanitizeQuery(query, maxLength = 80) {
  if (!query || typeof query !== 'string') return '';
  return query
    .trim()
    .slice(0, maxLength)
    .replace(/[<>{}[\]\\\/]/g, ''); // strip script-like special characters
}

/**
 * Validates serving size quantity
 */
function isValidServingSize(servingSize) {
  const num = Number(servingSize);
  return !isNaN(num) && num > 0 && num <= 5000;
}

/**
 * Validates meal preferences input
 */
function validateMealPreferences(prefs) {
  const allowedDiets = ['balanced', 'vegetarian', 'vegan', 'low-carb', 'high-protein'];
  const errors = [];

  if (prefs.dietary && !allowedDiets.includes(prefs.dietary)) {
    errors.push(`Invalid dietary preference. Allowed: ${allowedDiets.join(', ')}`);
  }

  if (prefs.calorieGoal !== undefined) {
    const cal = Number(prefs.calorieGoal);
    if (isNaN(cal) || cal < 800 || cal > 6000) {
      errors.push('Calorie goal must be between 800 and 6000 kcal.');
    }
  }

  if (prefs.mealsPerDay !== undefined) {
    const meals = Number(prefs.mealsPerDay);
    if (isNaN(meals) || meals < 1 || meals > 6) {
      errors.push('Meals per day must be between 1 and 6.');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidBarcode,
  sanitizeQuery,
  isValidServingSize,
  validateMealPreferences
};
