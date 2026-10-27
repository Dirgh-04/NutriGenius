const test = require('node:test');
const assert = require('node:assert');
const app = require('../backend/server');
const { normalizeRecipe } = require('../backend/services/mealDb');

function testRequest(app, method, url) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody = '';

    const req = {
      method,
      url,
      headers: { host: 'localhost' },
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

test('STAGE 3: normalizeRecipe cleans pairs of ingredients and measurements', () => {
  const rawMeal = {
    idMeal: '52772',
    strMeal: 'Teriyaki Chicken Casserole',
    strCategory: 'Chicken',
    strArea: 'Japanese',
    strInstructions: 'Boil water. Cook rice. Combine.',
    strMealThumb: 'https://example.com/thumb.jpg',
    strIngredient1: 'soy sauce',
    strMeasure1: '3/4 cup',
    strIngredient2: 'water',
    strMeasure2: '1/2 cup',
    strIngredient3: 'brown sugar',
    strMeasure3: '1/4 cup',
    strIngredient4: '',
    strMeasure4: ''
  };

  const normalized = normalizeRecipe(rawMeal);
  assert.strictEqual(normalized.id, '52772');
  assert.strictEqual(normalized.name, 'Teriyaki Chicken Casserole');
  assert.strictEqual(normalized.ingredients.length, 3);
  assert.deepStrictEqual(normalized.ingredientNames, ['soy sauce', 'water', 'brown sugar']);
  assert.strictEqual(normalized.ingredients[0].measurement, '3/4 cup');
});

test('STAGE 3: GET /api/recipes/search without query returns 400', async () => {
  const res = await testRequest(app, 'GET', '/api/recipes/search');
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('required'));
});

test('STAGE 3: GET /api/recipes/:id with non-numeric id returns 400', async () => {
  const res = await testRequest(app, 'GET', '/api/recipes/not-a-number');
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('numeric'));
});
