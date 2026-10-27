/**
 * NutriGenius AI - Centralized API Service Client
 * Handles requests to the Express backend with timeouts, auth tokens, and unified error handling.
 */
class ApiService {
  constructor(baseUrl) {
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else if (typeof window !== 'undefined' && window.CONFIG && window.CONFIG.API_BASE_URL) {
      this.baseUrl = window.CONFIG.API_BASE_URL;
    } else if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
      this.baseUrl = 'http://localhost:3000/api';
    } else {
      this.baseUrl = '/api';
    }
    this.defaultTimeoutMs = 12000;
  }

  /**
   * Internal wrapper around window.fetch with timeout and error extraction
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    const token = localStorage.getItem('nutrigenius_auth_token');

    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options.headers || {})
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || this.defaultTimeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const isJson = (response.headers.get('content-type') || '').includes('application/json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        const errorMsg = (data && data.error) ? data.error : `HTTP ${response.status}: ${response.statusText}`;
        const error = new Error(errorMsg);
        error.status = response.status;
        error.details = data;
        throw error;
      }

      return data;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new Error(`Request timed out after ${options.timeoutMs || this.defaultTimeoutMs}ms. Please check your backend connection.`);
      }
      throw err;
    }
  }

  // Health Check
  async checkHealth() {
    return this.request('/health');
  }

  // Food Analyzer (Open Food Facts)
  async getProductByBarcode(barcode) {
    return this.request(`/food/product/${encodeURIComponent(barcode)}`);
  }

  async searchProducts(query, page = 1) {
    return this.request(`/food/search?q=${encodeURIComponent(query)}&page=${page}`);
  }

  // Recipes (TheMealDB)
  async searchRecipes(query) {
    return this.request(`/recipes/search?q=${encodeURIComponent(query)}`);
  }

  async searchRecipesByIngredient(ingredient) {
    return this.request(`/recipes/ingredient?name=${encodeURIComponent(ingredient)}`);
  }

  async getRecipeById(id) {
    return this.request(`/recipes/${encodeURIComponent(id)}`);
  }

  // Fruits (Fruityvice)
  async getFruit(name) {
    return this.request(`/fruits/${encodeURIComponent(name)}`);
  }

  async getAllFruits() {
    return this.request('/fruits/all');
  }

  // Nutrition Tracking & Logs
  async getFoodLogs(date) {
    const q = date ? `?date=${encodeURIComponent(date)}` : '';
    return this.request(`/nutrition/logs${q}`);
  }

  async addFoodLog(entry) {
    return this.request('/nutrition/logs', {
      method: 'POST',
      body: JSON.stringify(entry)
    });
  }

  async deleteFoodLog(id) {
    return this.request(`/nutrition/logs/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }

  // Meal Planner
  async generateMealPlan(preferences) {
    return this.request('/meal-plans/generate', {
      method: 'POST',
      body: JSON.stringify(preferences)
    });
  }
}

// Global singleton instance
window.api = new ApiService();
