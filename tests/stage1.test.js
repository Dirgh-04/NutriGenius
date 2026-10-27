const test = require('node:test');
const assert = require('node:assert');
const app = require('../backend/server');

/**
 * Helper to dispatch an in-memory HTTP request to Express app without binding a network port
 */
function testRequest(app, method, url, body = null, headers = {}) {
  return new Promise((resolve) => {
    let statusCode = 200;
    const responseHeaders = {};
    let responseBody = '';

    const req = {
      method,
      url,
      headers: { host: 'localhost', ...headers },
      body,
      socket: { remoteAddress: '127.0.0.1' },
      ip: '127.0.0.1'
    };

    const res = {
      statusCode: 200,
      setHeader(k, v) { responseHeaders[k.toLowerCase()] = v; },
      getHeader(k) { return responseHeaders[k.toLowerCase()]; },
      status(code) {
        this.statusCode = code;
        statusCode = code;
        return this;
      },
      json(data) {
        responseBody = data;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      },
      end(data) {
        if (!responseBody) responseBody = data;
        resolve({ status: statusCode, body: responseBody, headers: responseHeaders });
      }
    };

    app(req, res);
  });
}

test('STAGE 1: Backend Health Check GET /api/health', async () => {
  const res = await testRequest(app, 'GET', '/api/health');
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.status, 'OK');
  assert.strictEqual(res.body.message, 'NutriGenius backend is working');
  assert.ok(res.body.timestamp);
});

test('STAGE 1: Route Skeletons are properly mounted', async () => {
  const endpoints = [
    { url: '/api/food/status', service: 'Open Food Facts Food Service' },
    { url: '/api/recipes/status', service: 'TheMealDB Recipe Service' },
    { url: '/api/fruits/status', service: 'Fruityvice Fruit Service' },
    { url: '/api/nutrition/status', service: 'Nutrition Tracker & Calculation Service' },
    { url: '/api/meal-plans/status', service: 'Meal Planning & Personalization Service' }
  ];

  for (const ep of endpoints) {
    const res = await testRequest(app, 'GET', ep.url);
    assert.strictEqual(res.status, 200, `Expected 200 for ${ep.url}`);
    assert.strictEqual(res.body.service, ep.service);
    assert.strictEqual(res.body.status, 'ready');
  }
});

test('STAGE 1: Unknown routes return 404 JSON', async () => {
  const res = await testRequest(app, 'GET', '/api/unknown-non-existent-route');
  assert.strictEqual(res.status, 404);
  assert.strictEqual(res.body.status, 404);
  assert.ok(res.body.error.includes('Route not found'));
});
