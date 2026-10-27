/**
 * NutriGenius AI — Dashboard Controller
 * Handles metric calculations, empty states, and Chart.js integration.
 */
class DashboardController {
  constructor() {
    this.chartInstance = null;
    this.demoModeActive = false;
  }

  async render() {
    // Check if user has active logs
    const logs = this.getUserFoodLogs();

    if (!logs || logs.length === 0) {
      this.renderEmptyState();
    } else {
      this.renderMetrics(logs);
      this.renderChart(logs);
    }
  }

  getUserFoodLogs() {
    // In Stage 1: Check localStorage for logged items
    try {
      const stored = localStorage.getItem('nutrigenius_food_logs');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  renderEmptyState() {
    const calorieVal = document.getElementById('dashCalorieValue');
    const proteinVal = document.getElementById('dashProteinValue');
    const carbsVal = document.getElementById('dashCarbsValue');
    const fatVal = document.getElementById('dashFatValue');

    if (calorieVal) calorieVal.textContent = '0';
    if (proteinVal) proteinVal.textContent = '0';
    if (carbsVal) carbsVal.textContent = '0';
    if (fatVal) fatVal.textContent = '0';

    // Set progress bars to 0%
    ['Calorie', 'Protein', 'Carbs', 'Fat'].forEach(nutrient => {
      const bar = document.getElementById(`dash${nutrient}Bar`);
      if (bar) bar.style.width = '0%';
    });

    // Render empty state in chart container
    const chartCard = document.getElementById('dashboardChartCard');
    if (chartCard) {
      const canvas = document.getElementById('nutritionChart');
      if (canvas) canvas.style.display = 'none';

      let emptyOverlay = document.getElementById('chartEmptyState');
      if (!emptyOverlay) {
        emptyOverlay = document.createElement('div');
        emptyOverlay.id = 'chartEmptyState';
        emptyOverlay.className = 'empty-state';
        emptyOverlay.innerHTML = `
          <div class="empty-state-icon">📊</div>
          <h3 class="empty-state-title">No Nutrition Logged Today</h3>
          <p class="empty-state-desc">
            Analyze packaged foods, search recipes, or log your meals to see your daily nutrient breakdown and goal tracking.
          </p>
          <button class="btn-accent" onclick="window.nutriGeniusApp.navigate('food')">
            🔍 Analyze a Food Product
          </button>
        `;
        chartCard.appendChild(emptyOverlay);
      } else {
        emptyOverlay.style.display = 'block';
      }
    }
  }

  renderMetrics(logs) {
    const goals = (window.CONFIG && window.CONFIG.DEFAULT_DAILY_GOALS) || {
      calories: 2000,
      protein: 60,
      carbs: 250,
      fat: 70
    };

    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;

    logs.forEach(item => {
      totalCalories += Number(item.calories) || 0;
      totalProtein += Number(item.protein) || 0;
      totalCarbs += Number(item.carbs) || 0;
      totalFat += Number(item.fat) || 0;
    });

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = Math.round(val);
    };

    const setBar = (id, val, goal) => {
      const el = document.getElementById(id);
      if (el) {
        const pct = Math.min(100, Math.round((val / goal) * 100));
        el.style.width = `${pct}%`;
      }
    };

    setVal('dashCalorieValue', totalCalories);
    setVal('dashProteinValue', totalProtein);
    setVal('dashCarbsValue', totalCarbs);
    setVal('dashFatValue', totalFat);

    setBar('dashCalorieBar', totalCalories, goals.calories);
    setBar('dashProteinBar', totalProtein, goals.protein);
    setBar('dashCarbsBar', totalCarbs, goals.carbs);
    setBar('dashFatBar', totalFat, goals.fat);
  }

  renderChart(logs) {
    const canvas = document.getElementById('nutritionChart');
    const emptyOverlay = document.getElementById('chartEmptyState');
    if (emptyOverlay) emptyOverlay.style.display = 'none';
    if (!canvas) return;

    canvas.style.display = 'block';

    if (typeof Chart === 'undefined') {
      console.warn('Chart.js is not loaded yet');
      return;
    }

    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Protein (g)', 'Carbohydrates (g)', 'Fat (g)'],
        datasets: [{
          data: [
            logs.reduce((sum, i) => sum + (Number(i.protein) || 0), 0),
            logs.reduce((sum, i) => sum + (Number(i.carbs) || 0), 0),
            logs.reduce((sum, i) => sum + (Number(i.fat) || 0), 0)
          ],
          backgroundColor: ['#6366f1', '#0ea5e9', '#ec4899'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  /**
   * Toggle Demo Data (clearly labeled)
   */
  loadDemoData() {
    const demoItems = [
      { name: 'Oatmeal with Almond Milk & Blueberries', calories: 340, protein: 12, carbs: 54, fat: 7 },
      { name: 'Grilled Chicken Salad with Olive Oil', calories: 480, protein: 42, carbs: 14, fat: 22 },
      { name: 'Greek Yogurt with Honey & Walnuts', calories: 250, protein: 18, carbs: 22, fat: 10 }
    ];

    localStorage.setItem('nutrigenius_food_logs', JSON.stringify(demoItems));
    this.demoModeActive = true;
    this.render();

    const banner = document.getElementById('demoDataBanner');
    if (banner) banner.style.display = 'flex';

    if (window.nutriGeniusApp) {
      window.nutriGeniusApp.showToast('Sample demo data loaded. Clearly labeled as demo.', 'info');
    }
  }

  clearData() {
    localStorage.removeItem('nutrigenius_food_logs');
    this.demoModeActive = false;
    this.render();

    const banner = document.getElementById('demoDataBanner');
    if (banner) banner.style.display = 'none';

    if (window.nutriGeniusApp) {
      window.nutriGeniusApp.showToast('Nutrition logs cleared.', 'info');
    }
  }
}

// Global instance
window.dashboardController = new DashboardController();
