const test = require('node:test');
const assert = require('node:assert');
const { calculatePortionNutrients, aggregateDailyNutrients } = require('../backend/utils/nutritionCalculations');
const { calculateComparisonScore, calculateIngredientMatch, rankRecipes } = require('../backend/utils/rankingAlgorithms');

test('STAGE 5: Portion calculation correctly scales per 100g values', () => {
  const nutrients100g = {
    calories: 400,
    protein: 20,
    carbohydrates: 50,
    sugars: 10,
    fat: 14,
    saturatedFat: 4,
    fiber: 6
  };

  // Test 50g portion (should be exactly 50% of 100g)
  const result50g = calculatePortionNutrients(nutrients100g, 50);
  assert.strictEqual(result50g.calculatedNutrients.calories.value, 200);
  assert.strictEqual(result50g.calculatedNutrients.protein.value, 10);
  assert.strictEqual(result50g.calculatedNutrients.carbohydrates.value, 25);
  assert.strictEqual(result50g.calculatedNutrients.sugars.value, 5);

  // Test 200g portion (double)
  const result200g = calculatePortionNutrients(nutrients100g, 200);
  assert.strictEqual(result200g.calculatedNutrients.calories.value, 800);
  assert.strictEqual(result200g.calculatedNutrients.protein.value, 40);
});

test('STAGE 5: Portion calculation flags missing values as unavailable and does not invent zeros', () => {
  const incompleteData = {
    calories: 250,
    protein: null, // missing from upstream API
    carbohydrates: undefined
  };

  const result = calculatePortionNutrients(incompleteData, 100);
  assert.strictEqual(result.calculatedNutrients.calories.value, 250);
  assert.strictEqual(result.calculatedNutrients.protein.value, null);
  assert.ok(result.unavailableNutrients.includes('protein'));
  assert.strictEqual(result.calculatedNutrients.protein.status, 'Data unavailable from source');
});

test('STAGE 5: Daily nutrition aggregation computes totals and macro energy percentages', () => {
  const logs = [
    { calories: 300, protein: 25, carbohydrates: 30, fat: 10 },
    { calories: 500, protein: 35, carbohydrates: 50, fat: 15 }
  ];

  const summary = aggregateDailyNutrients(logs);
  assert.strictEqual(summary.itemCount, 2);
  assert.strictEqual(summary.totals.calories, 800);
  assert.strictEqual(summary.totals.protein, 60);
  assert.strictEqual(summary.totals.carbohydrates, 80);
  assert.strictEqual(summary.totals.fat, 25);

  // Caloric verification: Protein 60*4=240, Carbs 80*4=320, Fat 25*9=225. Total = 785 kcal.
  // Protein pct: 240/785 ~= 31%
  assert.ok(summary.macroPercentages.proteinPct > 25 && summary.macroPercentages.proteinPct < 35);
  assert.ok(summary.macroPercentages.carbsPct > 35 && summary.macroPercentages.carbsPct < 45);
});

test('STAGE 5: Product comparison ranking transparently weights user priorities', () => {
  const highProteinBar = {
    name: 'Protein Bar',
    protein: 20,
    sugars: 2,
    calories: 210,
    fiber: 5,
    saturatedFat: 2
  };

  const sweetSnack = {
    name: 'Chocolate Wafer',
    protein: 4,
    sugars: 35,
    calories: 480,
    fiber: 1,
    saturatedFat: 14
  };

  // With priority 'low_sugar', highProteinBar should comfortably win
  const resultLowSugar = calculateComparisonScore(highProteinBar, sweetSnack, 'low_sugar');
  assert.strictEqual(resultLowSugar.winner, 'productA');
  assert.strictEqual(resultLowSugar.productAName, 'Protein Bar');
  assert.ok(resultLowSugar.scoreA > resultLowSugar.scoreB);
});

test('STAGE 5: Ingredient matching correctly categorizes matched, missing, and avoided items', () => {
  const pantry = ['chicken', 'garlic', 'olive oil'];
  const avoid = ['peanuts'];
  const recipeIngredients = ['chicken breast', 'garlic clove', 'peanuts', 'salt'];

  const match = calculateIngredientMatch(pantry, avoid, recipeIngredients);
  assert.strictEqual(match.containsAvoided, true);
  assert.ok(match.avoidedIngredientsFound.includes('peanuts'));
  assert.strictEqual(match.matchedIngredients.length, 2); // chicken breast, garlic clove
  assert.strictEqual(match.missingIngredients.length, 2); // peanuts, salt
});
