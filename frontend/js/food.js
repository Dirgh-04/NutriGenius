/**
 * NutriGenius AI — Food Analyzer Controller (Open Food Facts)
 * Full implementation supporting barcode lookup, keyword search,
 * serving-size calculator, allergen alerts, and direct logging.
 */
class FoodController {
  constructor() {
    this.currentProduct = null;
    this.currentPortion = 100;
  }

  async searchBarcode(barcode) {
    const rawCode = barcode || document.getElementById('foodBarcodeInput')?.value;
    if (!rawCode || !rawCode.trim()) {
      window.nutriGeniusApp?.showToast('Please enter an 8 to 14 digit barcode.', 'warning');
      return;
    }

    const trimmed = rawCode.trim();
    const resultBox = document.getElementById('foodResultArea');
    if (resultBox) {
      resultBox.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--color-text-muted); font-weight: 500;">
            Looking up barcode <strong>${trimmed}</strong> in Open Food Facts...
          </p>
        </div>
      `;
    }

    try {
      const data = await window.api.getProductByBarcode(trimmed);
      if (!data || !data.product) {
        throw new Error('Product not found in Open Food Facts');
      }
      this.currentProduct = data.product;
      this.currentPortion = 100;
      this.renderProduct(this.currentProduct);
      window.nutriGeniusApp?.showToast(`Loaded: ${this.currentProduct.productName}`, 'success');
    } catch (err) {
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="alert alert-warning" style="margin-top: 1rem;">
            <div>
              <strong>Product Not Found:</strong> ${err.message || 'No product matched this barcode.'}
              <div style="margin-top: 6px; font-size: 0.85rem;">
                Tip: Try one of the verified sample barcodes above (Nutella, Coca-Cola, or Noodles).
              </div>
            </div>
          </div>
        `;
      }
    }
  }

  async searchByKeyword(keyword) {
    const query = keyword || document.getElementById('foodKeywordInput')?.value;
    if (!query || !query.trim()) {
      window.nutriGeniusApp?.showToast('Please enter a product search query.', 'warning');
      return;
    }

    const resultBox = document.getElementById('foodResultArea');
    if (resultBox) {
      resultBox.innerHTML = `
        <div style="text-align: center; padding: 3rem;">
          <div class="spinner"></div>
          <p style="margin-top: 1rem; color: var(--color-text-muted);">Searching Open Food Facts for "${query}"...</p>
        </div>
      `;
    }

    try {
      const data = await window.api.searchProducts(query);
      if (data.status === 'partial_service') {
        resultBox.innerHTML = `
          <div class="alert alert-warning" style="margin-top: 1rem;">
            <div>
              <strong>Open Food Facts Notice:</strong> ${data.warning || 'Upstream search cluster is currently busy.'}
              <div style="margin-top: 8px; font-size: 0.85rem;">
                Tip: Direct barcode lookup remains fully functional! Try looking up: 
                <a href="javascript:void(0)" onclick="document.getElementById('foodBarcodeInput').value='3017620422003'; window.foodController.searchBarcode('3017620422003');">Nutella (3017620422003)</a> or 
                <a href="javascript:void(0)" onclick="document.getElementById('foodBarcodeInput').value='5449000000996'; window.foodController.searchBarcode('5449000000996');">Coca Cola (5449000000996)</a>.
              </div>
            </div>
          </div>
        `;
        return;
      }

      const products = data.products || [];
      if (products.length === 0) {
        resultBox.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h3 class="empty-state-title">No Products Found</h3>
            <p class="empty-state-desc">No packaged products found matching "${query}". Try searching by another keyword or entering an exact barcode.</p>
          </div>
        `;
        return;
      }
      this.renderSearchResults(products, query);
    } catch (err) {
      if (resultBox) {
        resultBox.innerHTML = `
          <div class="alert alert-warning">
            <strong>Search Error:</strong> ${err.message}
          </div>
        `;
      }
    }
  }

  renderSearchResults(products, query) {
    const resultBox = document.getElementById('foodResultArea');
    if (!resultBox) return;

    let html = `
      <div style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1.1rem; font-weight: 700;">Results for "${query}" (${products.length} items)</h3>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1rem;">
    `;

    products.forEach((p, idx) => {
      const img = p.imageUrl || '';
      const nutriscore = p.nutriscoreGrade ? `<span class="badge-nutriscore nutriscore-${p.nutriscoreGrade.toLowerCase()}">Nutri-Score ${p.nutriscoreGrade}</span>` : '';
      const cal = p.nutrients100g.calories !== null ? `${p.nutrients100g.calories} kcal` : 'Cal: N/A';

      html += `
        <div class="dashboard-card" style="padding: 1rem; display: flex; flex-direction: column; cursor: pointer;" onclick="window.foodController.selectSearchResult(${idx})">
          <div style="height: 140px; background: var(--color-surface-sunken); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; overflow: hidden; margin-bottom: 0.75rem;">
            ${img ? `<img src="${img}" alt="${p.productName}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<span style="font-size: 2.5rem; opacity: 0.5;">🥫</span>'}
          </div>
          <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px; line-height: 1.3;">${p.productName}</h4>
          <p style="font-size: 0.8rem; color: var(--color-text-muted); margin-bottom: 8px;">${p.brand || 'Brand not specified'}</p>
          <div style="margin-top: auto; display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 0.85rem; font-weight: 600; color: var(--color-calories);">${cal}</span>
            ${nutriscore}
          </div>
        </div>
      `;
    });

    html += '</div>';
    resultBox.innerHTML = html;
    this.searchResultsCache = products;
  }

  selectSearchResult(index) {
    if (this.searchResultsCache && this.searchResultsCache[index]) {
      this.currentProduct = this.searchResultsCache[index];
      this.currentPortion = 100;
      this.renderProduct(this.currentProduct);
    }
  }

  renderProduct(product) {
    const resultBox = document.getElementById('foodResultArea');
    if (!resultBox) return;

    const n = product.nutrients100g;
    const format = (val, unit) => val !== null && val !== undefined ? `${val} <span style="font-size: 0.8em; font-weight: normal; color: var(--color-text-muted);">${unit}</span>` : '<span style="color: var(--color-text-subtle); font-style: italic;">Unavailable</span>';

    const nutriscoreColors = {
      'A': '#038141',
      'B': '#85BB2F',
      'C': '#FECB02',
      'D': '#EE8100',
      'E': '#E63E11'
    };
    const nsGrade = product.nutriscoreGrade || 'N/A';
    const nsColor = nutriscoreColors[nsGrade] || 'var(--color-text-muted)';

    const allergensList = product.allergens && product.allergens.length > 0
      ? product.allergens.map(a => `<span class="badge" style="background: var(--color-sugar-bg); color: var(--color-sugar); font-size: 0.75rem; padding: 2px 8px; border-radius: var(--radius-full); margin-right: 4px;">⚠️ ${a}</span>`).join(' ')
      : '<span style="color: var(--color-text-muted); font-size: 0.85rem;">None explicitly declared</span>';

    resultBox.innerHTML = `
      <div class="dashboard-card" style="margin-top: 1.5rem; animation: fadeIn 250ms ease;">
        <div style="display: flex; gap: 2rem; flex-wrap: wrap;">
          <!-- Product Image & Core Badges -->
          <div style="flex: 0 0 240px; text-align: center;">
            <div style="width: 100%; height: 240px; background: var(--color-surface-sunken); border-radius: var(--radius-md); display: flex; align-items: center; justify-content: center; overflow: hidden; border: 1px solid var(--color-border); margin-bottom: 1rem;">
              ${product.imageUrl 
                ? `<img src="${product.imageUrl}" alt="${product.productName}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` 
                : '<div style="font-size: 3.5rem;">🥫</div>'}
            </div>
            <div style="display: flex; justify-content: center; gap: 8px;">
              <div style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: var(--radius-md); background: ${nsColor}; color: white; font-weight: 700; font-size: 0.9rem;">
                Nutri-Score ${nsGrade}
              </div>
            </div>
            <p style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 8px;">Barcode: ${product.barcode}</p>
          </div>

          <!-- Product Details & Nutrition -->
          <div style="flex: 1; min-width: 280px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
              <div>
                <h3 style="font-size: 1.5rem; font-weight: 800; color: var(--color-text-main); line-height: 1.2;">${product.productName}</h3>
                <p style="color: var(--color-primary); font-weight: 600; font-size: 0.95rem; margin-top: 2px;">${product.brand}</p>
              </div>

              <!-- Quick Action Buttons -->
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="btn-accent" style="padding: 8px 14px; font-size: 0.85rem;" onclick="window.foodController.logCurrentFood()">
                  + Log to Tracker
                </button>
                <button class="btn-secondary" style="padding: 8px 14px; font-size: 0.85rem;" onclick="window.foodController.sendToComparison()">
                  ⚖️ Compare
                </button>
              </div>
            </div>

            <!-- Portion Calculator Control -->
            <div style="background: var(--color-surface-sunken); border-radius: var(--radius-md); padding: 1rem; margin-bottom: 1.5rem; border: 1px solid var(--color-border);">
              <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 10px;">
                <div>
                  <span style="font-weight: 700; font-size: 0.95rem;">Portion Scaling Calculator</span>
                  <p style="font-size: 0.8rem; color: var(--color-text-muted);">Adjust serving size to recalculate nutrient values dynamically.</p>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <input type="number" id="portionInput" value="${this.currentPortion}" min="1" max="2000" style="width: 80px; padding: 6px 10px; border-radius: var(--radius-sm); border: 1px solid var(--color-border); font-weight: 600; text-align: center;">
                  <span style="font-size: 0.9rem; font-weight: 600;">grams (g)</span>
                  <button class="btn-secondary" style="padding: 6px 12px; font-size: 0.85rem;" onclick="window.foodController.applyPortion()">Update</button>
                </div>
              </div>
            </div>

            <!-- Nutrients Grid -->
            <h4 style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-muted); margin-bottom: 0.75rem;">
              Nutritional Values <span id="portionLabel" style="text-transform: none; font-weight: normal;">(per ${this.currentPortion}g)</span>
            </h4>
            <div id="nutrientsGrid" class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin-bottom: 1.5rem;">
              ${this.buildNutrientCards(n, this.currentPortion)}
            </div>

            <!-- Ingredients & Allergens -->
            <div style="margin-top: 1rem; border-top: 1px solid var(--color-border); padding-top: 1rem;">
              <h4 style="font-size: 0.95rem; font-weight: 700; margin-bottom: 4px;">Ingredients</h4>
              <p style="font-size: 0.875rem; color: var(--color-text-muted); line-height: 1.5; margin-bottom: 1rem;">
                ${product.ingredientsText}
              </p>
              <div>
                <strong style="font-size: 0.85rem;">Allergens:</strong>
                <div style="margin-top: 4px;">${allergensList}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  buildNutrientCards(n, portionGrams) {
    const factor = portionGrams / 100;
    const scale = (val) => val !== null && val !== undefined ? Number((val * factor).toFixed(1)) : null;

    const items = [
      { label: 'Energy', val: scale(n.calories), unit: 'kcal', color: 'var(--color-calories)' },
      { label: 'Protein', val: scale(n.protein), unit: 'g', color: 'var(--color-protein)' },
      { label: 'Carbs', val: scale(n.carbohydrates), unit: 'g', color: 'var(--color-carbs)' },
      { label: 'Sugars', val: scale(n.sugars), unit: 'g', color: 'var(--color-sugar)' },
      { label: 'Total Fat', val: scale(n.fat), unit: 'g', color: 'var(--color-fat)' },
      { label: 'Sat. Fat', val: scale(n.saturatedFat), unit: 'g', color: 'var(--color-text-muted)' },
      { label: 'Fiber', val: scale(n.fiber), unit: 'g', color: 'var(--color-fiber)' },
      { label: 'Salt', val: scale(n.salt), unit: 'g', color: 'var(--color-text-muted)' }
    ];

    return items.map(item => `
      <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 0.75rem; text-align: center;">
        <span style="font-size: 0.75rem; font-weight: 600; color: var(--color-text-muted); display: block; text-transform: uppercase;">${item.label}</span>
        <span style="font-size: 1.25rem; font-weight: 800; color: ${item.color};">
          ${item.val !== null ? item.val : '<span style="font-size: 0.75rem; color: var(--color-text-subtle);">N/A</span>'}
        </span>
        <span style="font-size: 0.75rem; color: var(--color-text-muted);">${item.val !== null ? item.unit : ''}</span>
      </div>
    `).join('');
  }

  applyPortion() {
    const input = document.getElementById('portionInput');
    const grams = Number(input?.value);
    if (!grams || grams <= 0 || grams > 5000) {
      window.nutriGeniusApp?.showToast('Please enter a valid portion between 1g and 5000g.', 'warning');
      return;
    }

    this.currentPortion = grams;
    const grid = document.getElementById('nutrientsGrid');
    const label = document.getElementById('portionLabel');

    if (grid && this.currentProduct) {
      grid.innerHTML = this.buildNutrientCards(this.currentProduct.nutrients100g, this.currentPortion);
    }
    if (label) {
      label.textContent = `(per ${this.currentPortion}g)`;
    }
    window.nutriGeniusApp?.showToast(`Scaled to ${this.currentPortion}g portion`, 'info');
  }

  logCurrentFood() {
    if (!this.currentProduct) return;
    const factor = this.currentPortion / 100;
    const n = this.currentProduct.nutrients100g;

    const entry = {
      food_name: this.currentProduct.productName,
      serving_quantity: this.currentPortion,
      serving_unit: 'g',
      meal_type: 'snack',
      calories: n.calories !== null ? Math.round(n.calories * factor) : 0,
      protein: n.protein !== null ? Number((n.protein * factor).toFixed(1)) : 0,
      carbohydrates: n.carbohydrates !== null ? Number((n.carbohydrates * factor).toFixed(1)) : 0,
      fat: n.fat !== null ? Number((n.fat * factor).toFixed(1)) : 0,
      sugar: n.sugars !== null ? Number((n.sugars * factor).toFixed(1)) : 0,
      fiber: n.fiber !== null ? Number((n.fiber * factor).toFixed(1)) : 0,
      barcode: this.currentProduct.barcode
    };

    window.nutritionTrackerController?.addCustomEntry(entry);
    window.nutriGeniusApp?.showToast(`Logged "${entry.food_name}" to Nutrition Tracker!`, 'success');
  }

  sendToComparison() {
    if (!this.currentProduct) return;
    window.comparisonController?.setProductA(this.currentProduct);
    window.nutriGeniusApp?.navigate('comparison');
    window.nutriGeniusApp?.showToast(`Set "${this.currentProduct.productName}" as Product A in Comparison`, 'info');
  }
}

window.foodController = new FoodController();
