/**
 * NutriGenius AI — Recipe Explorer Controller (TheMealDB)
 */
class RecipeController {
  constructor() {
    this.recipes = [];
    this.selectedRecipe = null;
  }

  async search(query) {
    const q = query || document.getElementById('recipeSearchInput')?.value;
    if (!q || !q.trim()) {
      window.nutriGeniusApp?.showToast('Please enter a recipe name (e.g. Chicken, Arrabiata, Curry).', 'warning');
      return;
    }

    const container = document.getElementById('recipeResultsArea');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--color-text-muted);">Searching recipes for "${q}"...</p>
        </div>
      `;
    }

    try {
      const data = await window.api.searchRecipes(q.trim());
      this.recipes = data.recipes || [];
      this.renderRecipeGrid(this.recipes, `Dishes matching "${q}"`);
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div class="alert alert-warning">
            Failed to search recipes: ${err.message}
          </div>
        `;
      }
    }
  }

  async searchByIngredient(ingredient) {
    const ing = ingredient || document.getElementById('recipeIngredientInput')?.value;
    if (!ing || !ing.trim()) {
      window.nutriGeniusApp?.showToast('Please enter an ingredient (e.g. chicken_breast, garlic).', 'warning');
      return;
    }

    const container = document.getElementById('recipeResultsArea');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--color-text-muted);">Finding dishes containing "${ing}"...</p>
        </div>
      `;
    }

    try {
      const data = await window.api.searchRecipesByIngredient(ing.trim());
      this.recipes = data.recipes || [];
      this.renderRecipeGrid(this.recipes, `Dishes featuring "${ing}"`);
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div class="alert alert-warning">
            Failed to search by ingredient: ${err.message}
          </div>
        `;
      }
    }
  }

  renderRecipeGrid(recipes, heading) {
    const container = document.getElementById('recipeResultsArea');
    if (!container) return;

    if (!recipes || recipes.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🍲</div>
          <h3 class="empty-state-title">No Recipes Found</h3>
          <p class="empty-state-desc">Try another dish name like "Salmon", "Pasta", "Soup", or "Curry".</p>
        </div>
      `;
      return;
    }

    let html = `
      <div style="margin-bottom: 1.25rem;">
        <h3 style="font-size: 1.15rem; font-weight: 700;">${heading} (${recipes.length} recipes)</h3>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1.25rem;">
    `;

    recipes.forEach((r, idx) => {
      const img = r.thumbnail || '';
      const cat = r.category ? `<span style="font-size: 0.75rem; background: var(--color-surface-sunken); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--color-text-muted);">${r.category}</span>` : '';
      const area = r.cuisine ? `<span style="font-size: 0.75rem; background: var(--color-primary-light); color: var(--color-primary); padding: 2px 8px; border-radius: var(--radius-sm); font-weight: 600;">${r.cuisine}</span>` : '';

      html += `
        <div class="dashboard-card" style="padding: 1rem; display: flex; flex-direction: column; cursor: pointer; transition: transform var(--transition-fast);" onclick="window.recipeController.openRecipeDetails('${r.id}')">
          <div style="height: 180px; border-radius: var(--radius-md); overflow: hidden; background: var(--color-surface-sunken); margin-bottom: 0.75rem;">
            ${img ? `<img src="${img}" alt="${r.name}" style="width: 100%; height: 100%; object-fit: cover;">` : '<div style="height: 100%; display: flex; align-items: center; justify-content: center; font-size: 3rem;">🍲</div>'}
          </div>
          <div style="display: flex; gap: 6px; margin-bottom: 6px;">
            ${area}
            ${cat}
          </div>
          <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 8px; line-height: 1.3;">${r.name}</h4>
          <span style="margin-top: auto; font-size: 0.85rem; font-weight: 600; color: var(--color-primary);">
            View Full Recipe & Ingredients →
          </span>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  }

  async openRecipeDetails(recipeId) {
    try {
      window.nutriGeniusApp?.showToast('Loading recipe instructions...', 'info');
      const data = await window.api.getRecipeById(recipeId);
      if (!data || !data.recipe) throw new Error('Recipe details not found');

      const r = data.recipe;
      this.selectedRecipe = r;

      const modal = document.getElementById('recipeModal') || this.createRecipeModal();
      const content = document.getElementById('recipeModalBody');

      content.innerHTML = `
        <div style="display: flex; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem;">
          <div style="flex: 0 0 260px; height: 260px; border-radius: var(--radius-md); overflow: hidden; background: var(--color-surface-sunken);">
            <img src="${r.thumbnail}" alt="${r.name}" style="width: 100%; height: 100%; object-fit: cover;">
          </div>
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; gap: 8px; margin-bottom: 8px;">
              <span class="badge" style="background: var(--color-primary-light); color: var(--color-primary); padding: 4px 10px; border-radius: var(--radius-full); font-weight: 700; font-size: 0.8rem;">${r.cuisine} Cuisine</span>
              <span class="badge" style="background: var(--color-surface-sunken); color: var(--color-text-muted); padding: 4px 10px; border-radius: var(--radius-full); font-size: 0.8rem;">${r.category}</span>
            </div>
            <h2 style="font-size: 1.6rem; font-weight: 800; margin-bottom: 1rem;">${r.name}</h2>
            
            <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 6px;">Ingredients & Measurements:</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; max-height: 160px; overflow-y: auto; padding-right: 4px;">
              ${r.ingredients.map(i => `
                <div style="background: var(--color-surface-sunken); padding: 4px 8px; border-radius: var(--radius-sm); font-size: 0.825rem;">
                  <strong>${i.ingredient}</strong>: <span style="color: var(--color-text-muted);">${i.measurement}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <div>
          <h4 style="font-size: 1rem; font-weight: 700; margin-bottom: 6px;">Preparation Instructions:</h4>
          <p style="font-size: 0.9rem; line-height: 1.6; color: var(--color-text-main); white-space: pre-line; background: var(--color-surface-sunken); padding: 1rem; border-radius: var(--radius-md); max-height: 240px; overflow-y: auto;">
            ${r.instructions}
          </p>
        </div>

        ${r.youtubeUrl ? `
          <div style="margin-top: 1rem;">
            <a href="${r.youtubeUrl}" target="_blank" rel="noopener" class="btn-secondary" style="display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem;">
              ▶️ Watch Video Tutorial on YouTube
            </a>
          </div>
        ` : ''}
      `;

      modal.style.display = 'flex';
    } catch (err) {
      window.nutriGeniusApp?.showToast(`Error: ${err.message}`, 'error');
    }
  }

  createRecipeModal() {
    const modal = document.createElement('div');
    modal.id = 'recipeModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100vw';
    modal.style.height = '100vh';
    modal.style.background = 'rgba(0,0,0,0.6)';
    modal.style.backdropFilter = 'blur(4px)';
    modal.style.zIndex = '200';
    modal.style.display = 'none';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.padding = '1rem';

    modal.innerHTML = `
      <div style="background: var(--color-surface); max-width: 720px; width: 100%; max-height: 90vh; border-radius: var(--radius-lg); box-shadow: var(--shadow-xl); overflow-y: auto; padding: 1.5rem; position: relative;">
        <button onclick="document.getElementById('recipeModal').style.display='none'" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--color-text-muted);">✕</button>
        <div id="recipeModalBody"></div>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.style.display = 'none';
    });

    document.body.appendChild(modal);
    return modal;
  }
}

window.recipeController = new RecipeController();
