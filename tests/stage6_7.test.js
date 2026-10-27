const test = require('node:test');
const assert = require('node:assert');
const app = require('../backend/server');
const spoonacular = require('../backend/services/spoonacular');

function testRequest(app, method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody = '';

    const req = {
      method,
      url,
      headers: { host: 'localhost', 'content-type': 'application/json', ...headers },
      body,
      socket: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1'
    };

    const res = {
      statusCode: 200,
      setHeader() {},
      getHeader() {},
      status(code) { this.statusCode = code; statusCode = code; return this; },
      json(data) { responseBody = data; resolve({ status: statusCode, body: responseBody }); },
      end(data) { if (!responseBody) responseBody = data; resolve({ status: statusCode, body: responseBody }); }
    };

    app(req, res);
  });
}

test('STAGE 6: POST /api/nutrition/compare compares two foods side-by-side', async () => {
  const payload = {
    productA: { name: 'Almonds', protein: 21, sugars: 4, calories: 579, fiber: 12 },
    productB: { name: 'Cashews', protein: 18, sugars: 6, calories: 553, fiber: 3 },
    priority: 'high_protein'
  };

  const res = await testRequest(app, 'POST', '/api/nutrition/compare', payload);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.comparison.productAName, 'Almonds');
  assert.strictEqual(res.body.comparison.winner, 'productA');
});

test('STAGE 6: Food logging lifecycle (POST log -> GET logs -> verify aggregated summary)', async () => {
  const today = '2026-10-27';
  const entry = {
    food_name: 'Greek Yogurt with Blueberries',
    serving_quantity: 150,
    serving_unit: 'g',
    meal_type: 'breakfast',
    calories: 140,
    protein: 15,
    carbohydrates: 12,
    fat: 3,
    sugar: 8,
    fiber: 2,
    log_date: today
  };

  // Add entry
  const postRes = await testRequest(app, 'POST', '/api/nutrition/logs', entry, { 'Authorization': 'Bearer demo-token' });
  assert.strictEqual(postRes.status, 201);
  assert.strictEqual(postRes.body.entry.food_name, 'Greek Yogurt with Blueberries');

  // Retrieve logs for date
  const getRes = await testRequest(app, 'GET', `/api/nutrition/logs?date=${today}`, null, { 'Authorization': 'Bearer demo-token' });
  assert.strictEqual(getRes.status, 200);
  assert.ok(getRes.body.logs.length >= 1);
  assert.ok(getRes.body.summary.totals.calories >= 140);
  assert.ok(getRes.body.summary.totals.protein >= 15);
});

test('STAGE 7: Meal Plan generator rejects invalid calorie goals', async () => {
  const invalidPrefs = { calorieGoal: 100 }; // too low
  const res = await testRequest(app, 'POST', '/api/meal-plans/generate', invalidPrefs);
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.details.some(e => e.includes('Calorie goal must be between')));
});

test('STAGE 9: Spoonacular optional integration operates safely without credentials', async () => {
  assert.strictEqual(spoonacular.isConfigured(), false);
  const result = await spoonacular.searchRecipesWithNutrition('chicken');
  assert.strictEqual(result.configured, false);
  assert.ok(result.message.includes('not configured'));
});
