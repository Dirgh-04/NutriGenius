const express = require('express');
const router = express.Router();
const fruityvice = require('../services/fruityvice');
const { sanitizeQuery } = require('../utils/validators');
const { calculateComparisonScore } = require('../utils/rankingAlgorithms');

/**
 * GET /api/fruits/all
 * Retrieve complete fruit catalog from Fruityvice
 */
router.get('/all', async (req, res, next) => {
  try {
    const fruits = await fruityvice.getAllFruits();
    res.status(200).json({
      status: 'success',
      count: fruits.length,
      fruits
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fruits/search?name=banana
 * Search fruit by name
 */
router.get('/search', async (req, res, next) => {
  try {
    const name = sanitizeQuery(req.query.name || '');
    if (!name) {
      return res.status(400).json({
        error: 'Fruit name query parameter "name" is required.',
        status: 400
      });
    }

    const fruit = await fruityvice.getFruitByName(name);
    if (!fruit) {
      return res.status(404).json({
        error: `Fruit "${name}" was not found in Fruityvice database.`,
        status: 404
      });
    }

    res.status(200).json({
      status: 'success',
      fruit
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fruits/compare?fruitA=banana&fruitB=apple
 * Side-by-side comparison of two raw fruits
 */
router.get('/compare', async (req, res, next) => {
  try {
    const fruitAName = sanitizeQuery(req.query.fruitA || '');
    const fruitBName = sanitizeQuery(req.query.fruitB || '');

    if (!fruitAName || !fruitBName) {
      return res.status(400).json({
        error: 'Both "fruitA" and "fruitB" query parameters are required.',
        status: 400
      });
    }

    const [fruitA, fruitB] = await Promise.all([
      fruityvice.getFruitByName(fruitAName),
      fruityvice.getFruitByName(fruitBName)
    ]);

    if (!fruitA) {
      return res.status(404).json({ error: `Fruit "${fruitAName}" was not found.` });
    }
    if (!fruitB) {
      return res.status(404).json({ error: `Fruit "${fruitBName}" was not found.` });
    }

    const comparison = calculateComparisonScore(
      { name: fruitA.name, ...fruitA.nutrients100g },
      { name: fruitB.name, ...fruitB.nutrients100g },
      req.query.priority || 'balanced'
    );

    res.status(200).json({
      status: 'success',
      fruitA,
      fruitB,
      comparison
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/fruits/status
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'Fruityvice Fruit Service',
    status: 'ready',
    endpoints: [
      'GET /api/fruits/all',
      'GET /api/fruits/search?name=:name',
      'GET /api/fruits/compare?fruitA=:a&fruitB=:b',
      'GET /api/fruits/:name'
    ]
  });
});

/**
 * GET /api/fruits/:name
 * Direct fruit lookup by path parameter
 */
router.get('/:name', async (req, res, next) => {
  try {
    const name = sanitizeQuery(req.params.name || '');
    if (!name) {
      return res.status(400).json({ error: 'Fruit name is required.', status: 400 });
    }

    const fruit = await fruityvice.getFruitByName(name);
    if (!fruit) {
      return res.status(404).json({
        error: `Fruit "${name}" was not found.`,
        status: 404
      });
    }

    res.status(200).json({
      status: 'success',
      fruit
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
