/**
 * NutriGenius AI — Personalized Meal Planner Controller
 */
class MealPlannerController {
  constructor() {
    this.currentPlan = null;
    this.savedPlans = [];
  }

  async generatePlan() {
    const dietary = document.getElementById('plannerDietarySelect')?.value || 'balanced';
    const calorieGoal = Number(document.getElementById('plannerCalorieGoal')?.value) || 2000;
    const mealsPerDay = Number(document.getElementById('plannerMealsPerDay')?.value) || 3;
    const preferredRaw = document.getElementById('plannerPreferredInput')?.value || '';
    const avoidedRaw = document.getElementById('plannerAvoidedInput')?.value || '';

    const preferredIngredients = preferredRaw.split(',').map(s => s.trim()).filter(Boolean);
    const avoidedIngredients = avoidedRaw.split(',').map(s => s.trim()).filter(Boolean);

    const container = document.getElementById('mealPlanResultsArea');
    if (container) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--color-text-muted);">
            Running heuristic ranking and generating ${dietary} meal plan for ${calorieGoal} kcal...
          </p>
        </div>
      `;
    }

    try {
      const response = await window.api.generateMealPlan({
        dietary,
        calorieGoal,
        mealsPerDay,
        preferredIngredients,
        avoidedIngredients
      });

      if (!response || !response.generatedPlan) throw new Error('Failed to generate meal plan');

      this.currentPlan = response.generatedPlan;
      this.renderPlan(this.currentPlan);
      window.nutriGeniusApp?.showToast('Generated personalized meal suggestions!', 'success');
    } catch (err) {
      if (container) {
        container.innerHTML = `
          <div class="alert alert-warning">
            Failed to generate plan: ${err.message}
          </div>
        `;
      }
    }
  }

  renderPlan(plan) {
    const container = document.getElementById('mealPlanResultsArea');
    if (!container) return;

    let html = `
      <div class="dashboard-card" style="margin-top: 1.5rem; animation: fadeIn 250ms ease;">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem; border-bottom: 1px solid var(--color-border); padding-bottom: 1rem;">
          <div>
            <span class="badge" style="background: var(--color-primary-light); color: var(--color-primary); font-size: 0.8rem; font-weight: 700; padding: 3px 10px; border-radius: var(--radius-full); text-transform: capitalize;">
              ${plan.dietaryPreference} • ${plan.dailyCalorieGoal} kcal Target
            </span>
            <h3 style="font-size: 1.4rem; font-weight: 800; margin-top: 6px;">Recommended Daily Meal Schedule</h3>
            <p style="font-size: 0.85rem; color: var(--color-text-muted);">${plan.algorithmExplanation}</p>
          </div>

          <button class="btn-accent" onclick="window.mealPlannerController.saveCurrentPlan()">
            💾 Save Meal Plan
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.25rem;">
    `;

    plan.meals.forEach(m => {
      const img = m.thumbnail ? `<img src="${m.thumbnail}" alt="${m.recipeName}" style="width: 100%; height: 160px; object-fit: cover; border-radius: var(--radius-md); margin-bottom: 0.75rem;">` : '';

      html += `
        <div style="background: var(--color-surface-sunken); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 1.25rem; display: flex; flex-direction: column;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
            <span style="font-size: 0.8rem; font-weight: 700; text-transform: uppercase; color: var(--color-primary); letter-spacing: 0.05em;">${m.mealType}</span>
            <span style="font-size: 0.85rem; font-weight: 700; color: var(--color-calories);">${m.targetCalories} kcal</span>
          </div>

          ${img}

          <h4 style="font-size: 1.1rem; font-weight: 700; margin-bottom: 6px; line-height: 1.3;">${m.recipeName}</h4>
          
          <div style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 0.75rem; line-height: 1.4;">
            <strong>Why selected:</strong> ${m.selectionReason}
          </div>

          <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center; pt-2; border-top: 1px solid rgba(0,0,0,0.06); padding-top: 0.75rem;">
            <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted);">
              Fit Score: <strong>${m.rankingScore}/100</strong>
            </span>
            ${m.recipeId !== 'default' ? `
              <button class="btn-secondary" style="padding: 4px 10px; font-size: 0.8rem;" onclick="window.recipeController.openRecipeDetails('${m.recipeId}')">
                Inspect Recipe
              </button>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>
        <div style="margin-top: 1.5rem; font-size: 0.8rem; color: var(--color-text-muted); background: var(--color-surface); padding: 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border);">
          ⚠️ <strong>Medical Disclaimer:</strong> Meal plan recommendations are mathematically optimized based on culinary database records and your personal nutrient target. They do not constitute prescribed medical nutrition therapy.
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  async saveCurrentPlan() {
    if (!this.currentPlan) return;
    try {
      await window.api.request('/meal-plans/save', {
        method: 'POST',
        body: JSON.stringify({
          planName: `${this.currentPlan.dietaryPreference} (${this.currentPlan.dailyCalorieGoal} kcal)`,
          plan: this.currentPlan
        })
      });
      window.nutriGeniusApp?.showToast('Meal plan saved successfully!', 'success');
    } catch (err) {
      window.nutriGeniusApp?.showToast(`Saved to session: ${err.message}`, 'info');
    }
  }
}

window.mealPlannerController = new MealPlannerController();
