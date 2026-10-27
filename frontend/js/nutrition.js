/**
 * NutriGenius AI — Daily Nutrition Tracker Controller
 * Handles food journaling, daily nutrient aggregation, and data persistence.
 */
class NutritionTrackerController {
  constructor() {
    this.currentDate = new Date().toISOString().split('T')[0];
    this.logs = [];
    this.summary = null;
  }

  async init() {
    const dateInput = document.getElementById('trackerDateInput');
    if (dateInput) {
      dateInput.value = this.currentDate;
      dateInput.addEventListener('change', (e) => {
        this.currentDate = e.target.value;
        this.loadLogs();
      });
    }
    this.loadLogs();
  }

  async loadLogs() {
    const tableBody = document.getElementById('trackerLogsTableBody');
    if (tableBody) {
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 2rem;"><div class="spinner"></div></td></tr>`;
    }

    try {
      const data = await window.api.getFoodLogs(this.currentDate);
      this.logs = data.logs || [];
      this.summary = data.summary;

      // Sync to localStorage for fast dashboard access
      localStorage.setItem('nutrigenius_food_logs', JSON.stringify(this.logs));

      this.renderTable(this.logs);
      this.renderSummary(this.summary);

      // Refresh dashboard if initialized
      if (window.dashboardController) {
        window.dashboardController.render();
      }
    } catch (err) {
      console.warn('Failed to fetch food logs from API, checking local storage:', err);
      const stored = localStorage.getItem('nutrigenius_food_logs');
      this.logs = stored ? JSON.parse(stored) : [];
      this.renderTable(this.logs);
    }
  }

  renderTable(logs) {
    const tableBody = document.getElementById('trackerLogsTableBody');
    const emptyNotice = document.getElementById('trackerEmptyNotice');
    if (!tableBody) return;

    if (!logs || logs.length === 0) {
      tableBody.innerHTML = '';
      if (emptyNotice) emptyNotice.style.display = 'block';
      return;
    }

    if (emptyNotice) emptyNotice.style.display = 'none';

    tableBody.innerHTML = logs.map(item => `
      <tr style="border-bottom: 1px solid var(--color-border);">
        <td style="padding: 12px 10px;">
          <strong style="color: var(--color-text-main);">${item.food_name}</strong>
          <div style="font-size: 0.75rem; color: var(--color-text-muted);">${item.serving_quantity || 100}${item.serving_unit || 'g'} • <span style="text-transform: capitalize;">${item.meal_type || 'meal'}</span></div>
        </td>
        <td style="padding: 12px 10px; font-weight: 700; color: var(--color-calories);">${item.calories} kcal</td>
        <td style="padding: 12px 10px; color: var(--color-protein); font-weight: 600;">${item.protein || item.protein_g || 0} g</td>
        <td style="padding: 12px 10px; color: var(--color-carbs); font-weight: 600;">${item.carbohydrates || item.carbs_g || 0} g</td>
        <td style="padding: 12px 10px; color: var(--color-fat); font-weight: 600;">${item.fat || item.fat_g || 0} g</td>
        <td style="padding: 12px 10px; text-align: right;">
          <button class="btn-secondary" style="padding: 4px 8px; font-size: 0.75rem; color: var(--color-danger); border-color: rgba(239, 68, 68, 0.3);" onclick="window.nutritionTrackerController.deleteEntry('${item.id}')">
            Delete
          </button>
        </td>
      </tr>
    `).join('');
  }

  renderSummary(summary) {
    if (!summary || !summary.totals) return;
    const t = summary.totals;

    const setEl = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };

    setEl('trackerTotalCalories', `${Math.round(t.calories)} kcal`);
    setEl('trackerTotalProtein', `${t.protein} g`);
    setEl('trackerTotalCarbs', `${t.carbohydrates} g`);
    setEl('trackerTotalFat', `${t.fat} g`);
  }

  async addCustomEntry(entry) {
    try {
      const payload = {
        food_name: entry.food_name || 'Custom Food Item',
        serving_quantity: Number(entry.serving_quantity) || 100,
        serving_unit: entry.serving_unit || 'g',
        meal_type: entry.meal_type || 'snack',
        calories: Number(entry.calories) || 0,
        protein: Number(entry.protein) || 0,
        carbohydrates: Number(entry.carbohydrates) || 0,
        fat: Number(entry.fat) || 0,
        sugar: Number(entry.sugar) || 0,
        fiber: Number(entry.fiber) || 0,
        log_date: this.currentDate,
        barcode: entry.barcode || null
      };

      await window.api.addFoodLog(payload);
      await this.loadLogs();
      window.nutriGeniusApp?.showToast(`Logged "${payload.food_name}" successfully!`, 'success');
    } catch (err) {
      // Local fallback
      const localEntry = { id: `local-${Date.now()}`, ...entry, log_date: this.currentDate };
      this.logs.push(localEntry);
      localStorage.setItem('nutrigenius_food_logs', JSON.stringify(this.logs));
      this.renderTable(this.logs);
      if (window.dashboardController) window.dashboardController.render();
      window.nutriGeniusApp?.showToast('Saved to local session.', 'info');
    }
  }

  async handleFormSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('manualFoodName')?.value;
    const cals = document.getElementById('manualCalories')?.value;
    const protein = document.getElementById('manualProtein')?.value;
    const carbs = document.getElementById('manualCarbs')?.value;
    const fat = document.getElementById('manualFat')?.value;
    const meal = document.getElementById('manualMealType')?.value;
    const portion = document.getElementById('manualServing')?.value;

    if (!name || !cals) {
      window.nutriGeniusApp?.showToast('Please provide at least Food Name and Calories.', 'warning');
      return;
    }

    await this.addCustomEntry({
      food_name: name,
      calories: cals,
      protein: protein || 0,
      carbohydrates: carbs || 0,
      fat: fat || 0,
      meal_type: meal || 'snack',
      serving_quantity: portion || 100
    });

    e.target.reset();
  }

  async deleteEntry(id) {
    if (!confirm('Are you sure you want to delete this food log entry?')) return;

    try {
      await window.api.deleteFoodLog(id);
      window.nutriGeniusApp?.showToast('Food entry deleted.', 'info');
      await this.loadLogs();
    } catch {
      this.logs = this.logs.filter(l => l.id !== id);
      localStorage.setItem('nutrigenius_food_logs', JSON.stringify(this.logs));
      this.renderTable(this.logs);
      if (window.dashboardController) window.dashboardController.render();
      window.nutriGeniusApp?.showToast('Removed from local session.', 'info');
    }
  }
}

window.nutritionTrackerController = new NutritionTrackerController();
