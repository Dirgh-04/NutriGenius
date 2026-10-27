const express = require('express');
const router = express.Router();
const requireAuth = require('../middleware/auth');
const mealDb = require('../services/mealDb');
const spoonacular = require('../services/spoonacular');
const { rankRecipes, calculateIngredientMatch } = require('../utils/rankingAlgorithms');
const { validateMealPreferences } = require('../utils/validators');
const { isConfigured, getClient } = require('../services/supabaseClient');

// In-memory meal plan store for demo fallback
const inMemoryMealPlans = [];

/**
 * GET /api/meal-plans/status
 */
router.get('/status', (req, res) => {
  res.json({
    service: 'Meal Planning & Personalization Service',
    status: 'ready',
    endpoints: [
      'POST /api/meal-plans/generate',
      'GET /api/meal-plans/saved',
      'POST /api/meal-plans/save'
    ]
  });
});

/**
 * POST /api/meal-plans/generate
 * Generates an explainable, personalized daily meal plan
 */
router.post('/generate', async (req, res, next) => {
  try {
    const preferences = req.body || {};
    const validation = validateMealPreferences(preferences);

    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Invalid preferences provided.',
        details: validation.errors
      });
    }

    const {
      dietary = 'balanced',
      calorieGoal = 2000,
      mealsPerDay = 3,
      preferredIngredients = [],
      avoidedIngredients = []
    } = preferences;

    // Search candidate dishes from TheMealDB for diverse meals
    const searchQueries = dietary === 'vegetarian' 
      ? ['Vegetarian', 'Salad', 'Soup']
      : ['Chicken', 'Fish', 'Vegetable', 'Pasta'];

    const recipeResults = await Promise.all(
      searchQueries.map(q => mealDb.searchRecipesByName(q).catch(() => ({ recipes: [] })))
    );

    const allCandidates = [];
    recipeResults.forEach(r => {
      if (r && r.recipes) allCandidates.push(...r.recipes);
    });

    // Remove duplicates
    const uniqueMap = new Map();
    allCandidates.forEach(r => {
      if (!uniqueMap.has(r.id)) uniqueMap.set(r.id, r);
    });
    const uniqueCandidates = Array.from(uniqueMap.values());

    // Rank candidate recipes using custom algorithm
    const ranked = rankRecipes(uniqueCandidates, {
      dietary,
      pantryIngredients: preferredIngredients,
      avoidedIngredients
    });

    // Structure into distinct daily meals
    const mealStructure = [];
    const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snack'].slice(0, mealsPerDay);
    const calorieSplit = {
      Breakfast: 0.25,
      Lunch: 0.40,
      Dinner: 0.35,
      Snack: 0.15
    };

    mealTypes.forEach((type, idx) => {
      const selected = ranked[idx % ranked.length] || {
        id: 'default',
        name: `${type} Selection`,
        thumbnail: null,
        ingredients: []
      };

      const targetCalories = Math.round(calorieGoal * (calorieSplit[type] || 0.33));

      mealStructure.push({
        mealType: type,
        targetCalories,
        recipeId: selected.id,
        recipeName: selected.name,
        thumbnail: selected.thumbnail,
        rankingScore: selected.rankingScore || 75,
        matchPercentage: selected.matchPercentage || 0,
        ingredients: selected.ingredients || [],
        containsAvoided: selected.containsAvoided || false,
        selectionReason: selected.reasons && selected.reasons.length > 0 
          ? selected.reasons.join(' • ')
          : `Selected to fulfill ${dietary} target of approximately ${targetCalories} kcal.`
      });
    });

    res.status(200).json({
      status: 'success',
      generatedPlan: {
        id: `plan-${Date.now()}`,
        dietaryPreference: dietary,
        dailyCalorieGoal: calorieGoal,
        mealsPerDay,
        meals: mealStructure,
        spoonacularIntegrated: spoonacular.isConfigured(),
        algorithmExplanation: 'Meals were ranked and selected using ingredient overlap, dietary constraint penalties, and balanced caloric allocation.'
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/meal-plans/save
 * Persists a generated meal plan
 */
router.post('/save', requireAuth, async (req, res, next) => {
  try {
    const { planName = 'My Saved Meal Plan', plan } = req.body;
    if (!plan || !plan.meals) {
      return res.status(400).json({ error: 'Valid meal plan object is required.' });
    }

    const planRecord = {
      id: `plan-${Date.now()}`,
      user_id: req.user.id,
      plan_name: planName,
      target_calories: plan.dailyCalorieGoal || 2000,
      dietary_type: plan.dietaryPreference || 'balanced',
      meals: plan.meals,
      created_at: new Date().toISOString()
    };

    const persistenceMode = isConfigured() && !req.isDemoUser ? 'supabase' : 'in_memory_demo';

    if (persistenceMode === 'supabase') {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('meal_plans')
        .insert([{
          user_id: req.user.id,
          plan_name: planRecord.plan_name,
          target_calories: planRecord.target_calories,
          dietary_type: planRecord.dietary_type,
          notes: JSON.stringify(planRecord.meals)
        }])
        .select();

      if (error) throw error;
      return res.status(201).json({ status: 'success', persistenceMode: 'supabase', plan: data[0] });
    }

    inMemoryMealPlans.push(planRecord);
    res.status(201).json({
      status: 'success',
      persistenceMode: 'in_memory_demo',
      plan: planRecord
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/meal-plans/saved
 */
router.get('/saved', requireAuth, async (req, res, next) => {
  try {
    const persistenceMode = isConfigured() && !req.isDemoUser ? 'supabase' : 'in_memory_demo';

    if (persistenceMode === 'supabase') {
      const supabase = getClient();
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return res.status(200).json({ status: 'success', persistenceMode: 'supabase', plans: data || [] });
    }

    const userPlans = inMemoryMealPlans.filter(p => p.user_id === req.user.id);
    res.status(200).json({
      status: 'success',
      persistenceMode: 'in_memory_demo',
      plans: userPlans
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
