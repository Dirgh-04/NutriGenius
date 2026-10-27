const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const { isConfigured, getClient } = require('../services/supabaseClient');
const { calculateComparisonScore } = require('../utils/rankingAlgorithms');
const { calculatePortionNutrients, aggregateDailyNutrients } = require('../utils/nutritionCalculations');
const { isValidServingSize } = require('../utils/validators');

// In-memory fallback log store for local evaluation when Supabase is not configured
const inMemoryLogs = [];

/**
 * GET /api/nutrition/status
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'Nutrition Tracker & Calculation Service',
    status: 'ready',
    endpoints: [
      'POST /api/nutrition/calculate-portion',
      'POST /api/nutrition/compare',
      'GET /api/nutrition/logs',
      'POST /api/nutrition/logs'
    ]
  });
});

/**
 * POST /api/nutrition/compare
 * Compare any two foods/products side-by-side
 */
router.post('/compare', (req, res, next) => {
  try {
    const { productA, productB, priority } = req.body;

    if (!productA || !productB) {
      return res.status(400).json({
        error: 'Both "productA" and "productB" objects are required in request body.',
        status: 400
      });
    }

    const comparison = calculateComparisonScore(productA, productB, priority || 'balanced');
    res.status(200).json({
      status: 'success',
      comparison
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nutrition/calculate-portion
 */
router.post('/calculate-portion', (req, res, next) => {
  try {
    const { nutrients100g, servingGrams } = req.body;
    if (!nutrients100g) {
      return res.status(400).json({ error: 'nutrients100g object is required.' });
    }
    if (!isValidServingSize(servingGrams)) {
      return res.status(400).json({ error: 'Valid serving size between 1 and 5000 is required.' });
    }

    const result = calculatePortionNutrients(nutrients100g, servingGrams);
    res.status(200).json({ status: 'success', ...result });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/nutrition/logs?date=YYYY-MM-DD
 * Retrieve food logs for a specific date and calculate daily aggregations
 */
router.get('/logs', requireAuth, async (req, res, next) => {
  try {
    const targetDate = req.query.date || new Date().toISOString().split('T')[0];
    const userId = req.user.id;

    let logs = [];
    const persistenceMode = isConfigured() && !req.isDemoUser ? 'supabase' : 'in_memory_demo';

    if (persistenceMode === 'supabase') {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('log_date', targetDate)
        .order('logged_at', { ascending: true });

      if (error) throw error;
      logs = data || [];
    } else {
      logs = inMemoryLogs.filter(l => l.user_id === userId && l.log_date === targetDate);
    }

    const summary = aggregateDailyNutrients(logs);

    res.status(200).json({
      status: 'success',
      date: targetDate,
      persistenceMode,
      logs,
      summary
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/nutrition/logs
 * Log a new food item
 */
router.post('/logs', requireAuth, async (req, res, next) => {
  try {
    const {
      food_name,
      serving_quantity = 100,
      serving_unit = 'g',
      meal_type = 'snack',
      calories,
      protein = 0,
      carbohydrates = 0,
      fat = 0,
      sugar = 0,
      fiber = 0,
      log_date = new Date().toISOString().split('T')[0],
      barcode = null,
      notes = ''
    } = req.body;

    if (!food_name || food_name.trim() === '') {
      return res.status(400).json({ error: 'food_name is required.', status: 400 });
    }

    if (calories === undefined || calories === null || isNaN(Number(calories))) {
      return res.status(400).json({ error: 'Numeric calories value is required.', status: 400 });
    }

    const newEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      user_id: req.user.id,
      food_name: food_name.trim(),
      serving_quantity: Number(serving_quantity),
      serving_unit,
      meal_type,
      calories: Number(calories),
      protein: Number(protein) || 0,
      carbohydrates: Number(carbohydrates) || 0,
      fat: Number(fat) || 0,
      sugar: Number(sugar) || 0,
      fiber: Number(fiber) || 0,
      log_date,
      barcode,
      notes,
      logged_at: new Date().toISOString()
    };

    const persistenceMode = isConfigured() && !req.isDemoUser ? 'supabase' : 'in_memory_demo';

    if (persistenceMode === 'supabase') {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('food_logs')
        .insert([{
          user_id: req.user.id,
          food_name: newEntry.food_name,
          serving_quantity: newEntry.serving_quantity,
          serving_unit: newEntry.serving_unit,
          meal_type: newEntry.meal_type,
          calories: newEntry.calories,
          protein_g: newEntry.protein,
          carbs_g: newEntry.carbohydrates,
          fat_g: newEntry.fat,
          sugar_g: newEntry.sugar,
          fiber_g: newEntry.fiber,
          log_date: newEntry.log_date,
          barcode: newEntry.barcode,
          notes: newEntry.notes
        }])
        .select();

      if (error) throw error;
      return res.status(201).json({ status: 'success', persistenceMode: 'supabase', entry: data[0] });
    }

    // In-memory demo persistence
    inMemoryLogs.push(newEntry);
    res.status(201).json({
      status: 'success',
      persistenceMode: 'in_memory_demo',
      entry: newEntry
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/nutrition/logs/:id
 * Delete a logged item
 */
router.delete('/logs/:id', requireAuth, async (req, res, next) => {
  try {
    const { id } = req.params;
    const persistenceMode = isConfigured() && !req.isDemoUser ? 'supabase' : 'in_memory_demo';

    if (persistenceMode === 'supabase') {
      const supabase = getClient();
      const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', id)
        .eq('user_id', req.user.id);

      if (error) throw error;
      return res.status(200).json({ status: 'success', deletedId: id });
    }

    const index = inMemoryLogs.findIndex(l => l.id === id && l.user_id === req.user.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Food entry not found.', status: 404 });
    }

    inMemoryLogs.splice(index, 1);
    res.status(200).json({ status: 'success', deletedId: id });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
