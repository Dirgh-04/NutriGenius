/**
 * NutriGenius AI — Fruit Nutrition & Taxonomy Controller (Fruityvice)
 */
class FruitController {
  constructor() {
    this.currentFruit = null;
    this.fruitCatalog = [];
  }

  async init() {
    // Pre-populate quick list if not already loaded
    this.loadCatalog();
  }

  async loadCatalog() {
    try {
      const data = await window.api.getAllFruits();
      if (data && data.fruits) {
        this.fruitCatalog = data.fruits;
        this.renderCatalogChips(data.fruits);
      }
    } catch {
      // Fallback chips if offline or rate-limited
      const defaults = ['Banana', 'Apple', 'Strawberry', 'Mango', 'Orange', 'Kiwi', 'Watermelon', 'Pineapple'];
      this.renderCatalogChips(defaults.map(name => ({ name })));
    }
  }

  renderCatalogChips(fruits) {
    const chipBox = document.getElementById('fruitChipsContainer');
    if (!chipBox) return;

    chipBox.innerHTML = fruits.slice(0, 16).map(f => `
      <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.825rem; border-radius: var(--radius-full);" onclick="document.getElementById('fruitSearchInput').value='${f.name}'; window.fruitController.search('${f.name}');">
        🍎 ${f.name}
      </button>
    `).join(' ');
  }

  async search(name) {
    const fruitName = name || document.getElementById('fruitSearchInput')?.value;
    if (!fruitName || !fruitName.trim()) {
      window.nutriGeniusApp?.showToast('Please enter a fruit name.', 'warning');
      return;
    }

    const trimmed = fruitName.trim();
    const resultBox = document.getElementById('fruitResultsArea');
    if (resultBox) {
      resultBox.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--color-text-muted);">Fetching taxonomy and nutrition for "${trimmed}" from Fruityvice...</p>
        </div>
      `;
    }

    try {
      const data = await window.api.getFruit(trimmed);
      if (!data || !data.fruit) throw new Error('Fruit not found in Fruityvice database');
      this.currentFruit = data.fruit;
      this.renderFruitDetails(data.fruit);
      window.nutriGeniusApp?.showToast(`Loaded: ${data.fruit.name}`, 'success');
    } catch (err) {
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="alert alert-warning">
            <strong>Fruit Not Found:</strong> ${err.message || 'Could not find fruit.'} 
            Try clicking one of the popular fruit chips above.
          </div>
        `;
      }
    }
  }

  renderFruitDetails(fruit) {
    const resultBox = document.getElementById('fruitResultsArea');
    if (!resultBox) return;

    const n = fruit.nutrients100g || {};

    resultBox.innerHTML = `
      <div class="dashboard-card" style="margin-top: 1.5rem; animation: fadeIn 250ms ease;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
          <div>
            <div style="display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); font-size: 0.8rem; font-weight: 700; margin-bottom: 6px;">
              🌿 Botanical Classification
            </div>
            <h2 style="font-size: 1.8rem; font-weight: 800; color: var(--color-text-main);">${fruit.name}</h2>
            <p style="font-size: 0.9rem; color: var(--color-text-muted);">
              Family: <strong>${fruit.family}</strong> • Genus: <em>${fruit.genus}</em> • Order: ${fruit.order}
            </p>
          </div>

          <button class="btn-accent" style="font-size: 0.85rem;" onclick="window.fruitController.logFruit()">
            + Log Fruit to Daily Journal
          </button>
        </div>

        <h4 style="font-size: 0.95rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 1rem;">
          Raw Nutritional Content (Per 100g)
        </h4>

        <div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div style="background: var(--color-calories-bg); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(245, 158, 11, 0.2);">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-calories); display: block;">CALORIES</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main);">${n.calories}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">kcal</span>
          </div>

          <div style="background: var(--color-carbs-bg); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(14, 165, 233, 0.2);">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-carbs); display: block;">CARBOHYDRATES</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main);">${n.carbohydrates}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">grams</span>
          </div>

          <div style="background: var(--color-sugar-bg); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(239, 68, 68, 0.2);">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-sugar); display: block;">NATURAL SUGARS</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main);">${n.sugar}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">grams</span>
          </div>

          <div style="background: var(--color-protein-bg); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(99, 102, 241, 0.2);">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-protein); display: block;">PROTEIN</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main);">${n.protein}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">grams</span>
          </div>

          <div style="background: var(--color-fat-bg); padding: 1rem; border-radius: var(--radius-md); text-align: center; border: 1px solid rgba(236, 72, 153, 0.2);">
            <span style="font-size: 0.8rem; font-weight: 600; color: var(--color-fat); display: block;">TOTAL FAT</span>
            <span style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main);">${n.fat}</span>
            <span style="font-size: 0.8rem; color: var(--color-text-muted);">grams</span>
          </div>
        </div>

        <div style="font-size: 0.85rem; color: var(--color-text-muted); background: var(--color-surface-sunken); padding: 12px; border-radius: var(--radius-md);">
          🌱 <strong>Fruityvice Source Note:</strong> Values reflect natural whole-fruit averages per 100 grams of edible portion. Natural sugar in fruit is accompanied by vitamins, minerals, and dietary water.
        </div>
      </div>
    `;
  }

  logFruit() {
    if (!this.currentFruit) return;
    const n = this.currentFruit.nutrients100g || {};
    const entry = {
      food_name: `${this.currentFruit.name} (Fresh Whole Fruit)`,
      serving_quantity: 100,
      serving_unit: 'g',
      meal_type: 'snack',
      calories: Math.round(n.calories || 0),
      protein: n.protein || 0,
      carbohydrates: n.carbohydrates || 0,
      fat: n.fat || 0,
      sugar: n.sugar || 0,
      fiber: 2.5 // typical raw fruit baseline
    };

    window.nutritionTrackerController?.addCustomEntry(entry);
    window.nutriGeniusApp?.showToast(`Logged "${this.currentFruit.name}" to Daily Nutrition!`, 'success');
  }
}

window.fruitController = new FruitController();
