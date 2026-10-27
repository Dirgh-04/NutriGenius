/**
 * Vercel Serverless Function Catch-All for NutriGenius API
 * Intercepts /api/* requests (e.g. /api/health, /api/food/..., /api/recipes/...)
 */
const app = require('../backend/server');

module.exports = (req, res) => {
  return app(req, res);
};
