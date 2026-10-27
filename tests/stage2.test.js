const test = require('node:test');
const assert = require('node:assert');
const app = require('../backend/server');
const { isValidBarcode } = require('../backend/utils/validators');
const { normalizeProductData } = require('../backend/services/openFoodFacts');

function testRequest(app, method, url, body = null) {
  return new Promise((resolve) => {
    let statusCode = 200;
    let responseBody = '';

    const req = {
      method,
      url,
      headers: { host: 'localhost', 'content-type': 'application/json' },
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

test('STAGE 2: Barcode Validator correctly identifies valid retail barcodes', () => {
  assert.strictEqual(isValidBarcode('3017620422003'), true); // 13 digits EAN
  assert.strictEqual(isValidBarcode('737628064502'), true);  // 12 digits UPC
  assert.strictEqual(isValidBarcode('12345678'), true);      // 8 digits EAN-8
  assert.strictEqual(isValidBarcode('abc123'), false);       // Alphanumeric
  assert.strictEqual(isValidBarcode('123'), false);          // Too short
  assert.strictEqual(isValidBarcode(''), false);             // Empty
});

test('STAGE 2: GET /api/food/product/:barcode rejects invalid barcode formats with 400', async () => {
  const res = await testRequest(app, 'GET', '/api/food/product/invalid-barcode-xyz');
  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.status, 400);
  assert.ok(res.body.error.includes('Invalid barcode format'));
});

test('STAGE 2: POST /api/food/calculate-portion returns scaled nutrients', async () => {
  const payload = {
    nutrients100g: {
      calories: 500,
      protein: 10,
      carbohydrates: 60,
      sugars: 30,
      fat: 25
    },
    servingGrams: 50
  };

  const res = await testRequest(app, 'POST', '/api/food/calculate-portion', payload);
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.servingSizeGrams, 50);
  assert.strictEqual(res.body.calculatedNutrients.calories.value, 250);
  assert.strictEqual(res.body.calculatedNutrients.protein.value, 5);
});

test('STAGE 2: normalizeProductData handles nulls honestly without creating false zeros', () => {
  const rawOFF = {
    code: '1234567890123',
    product_name: 'Natural Mineral Water',
    nutriments: {
      // Mineral water has no energy or protein reported in many OFF records
      'energy-kcal': null
    }
  };

  const normalized = normalizeProductData(rawOFF);
  assert.strictEqual(normalized.barcode, '1234567890123');
  assert.strictEqual(normalized.productName, 'Natural Mineral Water');
  assert.strictEqual(normalized.nutrients100g.calories, null);
  assert.strictEqual(normalized.nutrients100g.protein, null);
});
