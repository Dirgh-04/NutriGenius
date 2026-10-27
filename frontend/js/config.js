/**
 * NutriGenius — Frontend Configuration
 * Centralized settings for backend API and client environment.
 */
const CONFIG = {
  // Backend API base URL (relative '/api' on production hosts, localhost in dev)
  API_BASE_URL: (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000/api'
    : '/api',

  // Health check endpoint
  HEALTH_CHECK_INTERVAL_MS: 30000,

  // App Metadata
  APP_NAME: 'NutriGenius',
  APP_VERSION: '1.0.0',
  APP_TAGLINE: 'Understand Your Food. Make Better Choices.',

  // Default nutritional daily reference values (adult standard)
  DEFAULT_DAILY_GOALS: {
    calories: 2000,
    protein: 60, // grams
    carbs: 250,  // grams
    fat: 70,     // grams
    sugar: 30,   // grams
    fiber: 30    // grams
  }
};

// Explicitly bind to window for global browser availability
if (typeof window !== 'undefined') {
  window.CONFIG = CONFIG;
}

// Make immutable in browser
Object.freeze(CONFIG);
Object.freeze(CONFIG.DEFAULT_DAILY_GOALS);
