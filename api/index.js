/**
 * Vercel Serverless Function Root for NutriGenius API
 * Handles /api requests
 */
const app = require('../backend/server');

module.exports = (req, res) => {
  return app(req, res);
};
