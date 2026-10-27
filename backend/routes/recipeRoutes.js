const express = require('express');
const router = express.Router();
const mealDb = require('../services/mealDb');
const { sanitizeQuery } = require('../utils/validators');

/**
 * GET /api/recipes/search?q=arrabiata
 * Search recipes by title or dish name
 */
router.get('/search', async (req, res, next) => {
  try {
    const query = sanitizeQuery(req.query.q || '');
    if (!query) {
      return res.status(400).json({
        error: 'Search query parameter "q" is required.',
        status: 400
      });
    }

    const result = await mealDb.searchRecipesByName(query);
    res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/recipes/ingredient?name=chicken_breast
 * Filter recipes by ingredient
 */
router.get('/ingredient', async (req, res, next) => {
  try {
    const ingredient = sanitizeQuery(req.query.name || '');
    if (!ingredient) {
      return res.status(400).json({
        error: 'Ingredient query parameter "name" is required.',
        status: 400
      });
    }

    const result = await mealDb.searchRecipesByIngredient(ingredient);
    res.status(200).json({
      status: 'success',
      ...result
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/recipes/status
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'TheMealDB Recipe Service',
    status: 'ready',
    endpoints: [
      'GET /api/recipes/search?q=:name',
      'GET /api/recipes/ingredient?name=:ingredient',
      'GET /api/recipes/:id'
    ]
  });
});

/**
 * GET /api/recipes/:id
 * Retrieve recipe full details by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!id || !/^\d+$/.test(id)) {
      return res.status(400).json({
        error: 'Recipe ID must be a numeric string.',
        status: 400
      });
    }

    const recipe = await mealDb.getRecipeById(id);
    if (!recipe) {
      return res.status(404).json({
        error: `Recipe with ID ${id} was not found.`,
        status: 404
      });
    }

    res.status(200).json({
      status: 'success',
      recipe
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
