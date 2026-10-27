const test = require('node:test');
const assert = require('node:assert');
const app = require('../backend/server');
const { normalizeFruit } = require('../backend/services/fruityvice');

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

test('STAGE 4: normalizeFruit extracts taxonomy and raw nutrients per 100g', () => {
  const rawFruit = {
    genus: 'Musa',
    name: 'Banana',
    id: 1,
    family: 'Musaceae',
    order: 'Zingiberales',
    nutritions: {
      carbohydrates: 22,
      protein: 1,
      fat: 0.2,
      calories: 96,
      sugar: 17.2
    }
  };

  const normalized = normalizeFruit(rawFruit);
  assert.strictEqual(normalized.name, 'Banana');
  assert.strictEqual(normalized.family, 'Musaceae');
  assert.strictEqual(normalized.genus, 'Musa');
  assert.strictEqual(normalized.nutrients100g.calories, 96);
  assert.strictEqual(normalized.nutrients100g.sugar, 17.2);
});

test('STAGE 4: GET /api/fruits/compare requires both fruitA and fruitB parameters', async () => {
  const res = await testRequest(app, 'GET', '/api/fruits/compare?fruitA=banana');
  assert.strictEqual(res.status, 400);
  assert.ok(res.body.error.includes('Both "fruitA" and "fruitB"'));
});
