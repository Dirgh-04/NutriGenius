const express = require('express');
const router = express.Router();
const openFoodFacts = require('../services/openFoodFacts');
const { isValidBarcode, sanitizeQuery, isValidServingSize } = require('../utils/validators');
const { calculatePortionNutrients } = require('../utils/nutritionCalculations');

/**
 * GET /api/food/status
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'Open Food Facts Food Service',
    status: 'ready',
    endpoints: [
      'GET /api/food/product/:barcode',
      'GET /api/food/search?q=:query',
      'POST /api/food/calculate-portion'
    ]
  });
});

/**
 * GET /api/food/product/:barcode
 * Look up packaged food product by barcode
 */
router.get('/product/:barcode', async (req, res, next) => {
  try {
    const { barcode } = req.params;

    if (!isValidBarcode(barcode)) {
      return res.status(400).json({
        error: 'Invalid barcode format. Barcodes must contain 8 to 14 numeric digits.',
        status: 400
      });
    }

    const product = await openFoodFacts.getProductByBarcode(barcode);

    if (!product) {
      return res.status(404).json({
        error: `Product with barcode "${barcode}" was not found in Open Food Facts database.`,
        status: 404
      });
    }

    res.status(200).json({
      status: 'success',
      product
    });
  } catch (err) {
    console.error(`[Open Food Facts Barcode Error] ${req.params.barcode}:`, err.message);
    res.status(502).json({
      error: `Could not reach Open Food Facts server (${err.message}). Please check internet connectivity or try again in a moment.`,
      status: 502
    });
  }
});

/**
 * GET /api/food/search?q=chocolate&page=1
 * Search packaged food products by keyword with graceful fallback
 */
router.get('/search', async (req, res, next) => {
  try {
    const rawQuery = req.query.q || '';
    const query = sanitizeQuery(rawQuery);
    const page = parseInt(req.query.page, 10) || 1;

    if (!query) {
      return res.status(400).json({
        error: 'Search query parameter "q" is required.',
        status: 400
      });
    }

    try {
      const result = await openFoodFacts.searchProducts(query, page);
      res.status(200).json({
        status: 'success',
        ...result
      });
    } catch (searchErr) {
      console.warn(`[Open Food Facts Search Warning] Query "${query}":`, searchErr.message);
      // Return 200 with clear message so frontend displays graceful instructions
      res.status(200).json({
        status: 'partial_service',
        query,
        page,
        products: [],
        warning: 'The Open Food Facts search cluster is temporarily busy or rate-limited. Barcode lookup remains fully functional.',
        error: searchErr.message
      });
    }
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/food/calculate-portion
 * Calculates nutrient distribution for a user-specified portion size
 */
router.post('/calculate-portion', (req, res, next) => {
  try {
    const { nutrients100g, servingGrams } = req.body;

    if (!nutrients100g) {
      return res.status(400).json({
        error: 'Missing required field: nutrients100g',
        status: 400
      });
    }

    if (!isValidServingSize(servingGrams)) {
      return res.status(400).json({
        error: 'Serving size must be a valid number between 1g and 5000g.',
        status: 400
      });
    }

    const calculated = calculatePortionNutrients(nutrients100g, servingGrams);

    res.status(200).json({
      status: 'success',
      ...calculated
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
