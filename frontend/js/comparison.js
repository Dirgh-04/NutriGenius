/**
 * NutriGenius — Product Comparison Controller
 * Side-by-side nutritional comparator supporting Barcode lookup & Name Search
 * with user-defined nutritional priority weighting.
 */
class ComparisonController {
  constructor() {
    this.productA = null;
    this.productB = null;
    this.priority = 'balanced';
    this.searchResultsA = [];
    this.searchResultsB = [];
  }

  /**
   * Switch between Barcode lookup and Name search modes for a slot
   */
  switchMode(slot, mode) {
    const barcodeBox = document.getElementById(`modeBarcode${slot}`);
    const nameBox = document.getElementById(`modeName${slot}`);
    const tabBarcode = document.getElementById(`tabBarcode${slot}`);
    const tabName = document.getElementById(`tabName${slot}`);

    if (mode === 'barcode') {
      if (barcodeBox) barcodeBox.style.display = 'block';
      if (nameBox) nameBox.style.display = 'none';
      if (tabBarcode) tabBarcode.classList.add('active');
      if (tabName) tabName.classList.remove('active');
    } else {
      if (barcodeBox) barcodeBox.style.display = 'none';
      if (nameBox) nameBox.style.display = 'block';
      if (tabBarcode) tabBarcode.classList.remove('active');
      if (tabName) tabName.classList.add('active');

      const input = document.getElementById(`compareName${slot}`);
      if (input) {
        input.focus();
        input.select();
      }
    }
  }

  setProductA(product) {
    this.productA = product;
    this.updateSlotBadge('A', true);
    this.renderSlot('A', product);
    this.triggerComparisonIfReady();
  }

  setProductB(product) {
    this.productB = product;
    this.updateSlotBadge('B', true);
    this.renderSlot('B', product);
    this.triggerComparisonIfReady();
  }

  updateSlotBadge(slot, isSelected) {
    const badge = document.getElementById(`badgeSlot${slot}`);
    if (!badge) return;
    if (isSelected) {
      badge.textContent = 'Selected';
      badge.style.background = 'var(--color-primary-light)';
      badge.style.color = 'var(--color-primary)';
      badge.style.border = '1px solid var(--color-primary-border)';
    } else {
      badge.textContent = 'Not selected';
      badge.style.background = 'var(--color-surface-sunken)';
      badge.style.color = 'var(--color-text-muted)';
      badge.style.border = 'none';
    }
  }

  /**
   * Fetch a product by barcode for slot A or B
   */
  async loadBarcode(slot, barcode) {
    const code = barcode || document.getElementById(`compareBarcode${slot}`)?.value;
    if (!code || !code.trim()) {
      window.nutriGeniusApp?.showToast(`Please enter barcode for Product ${slot}`, 'warning');
      return;
    }

    try {
      window.nutriGeniusApp?.showToast(`Fetching Product ${slot}...`, 'info');
      const data = await window.api.getProductByBarcode(code.trim());
      if (data && data.product) {
        if (slot === 'A') this.setProductA(data.product);
        else this.setProductB(data.product);

        // Clear any search list
        const resultsBox = document.getElementById(`compareSearchResults${slot}`);
        if (resultsBox) resultsBox.innerHTML = '';

        window.nutriGeniusApp?.showToast(`Loaded Product ${slot}: ${data.product.productName}`, 'success');
      }
    } catch (err) {
      window.nutriGeniusApp?.showToast(`Failed to load Product ${slot}: ${err.message}`, 'error');
    }
  }

  /**
   * Quick search trigger via suggestion chips
   */
  quickSearchName(slot, keyword) {
    const input = document.getElementById(`compareName${slot}`);
    if (input) input.value = keyword;
    this.searchName(slot, keyword);
  }

  /**
   * Search packaged food products by name/keyword
   */
  async searchName(slot, keyword) {
    const input = document.getElementById(`compareName${slot}`);
    const query = keyword || (input ? input.value : '');

    if (!query || !query.trim()) {
      window.nutriGeniusApp?.showToast(`Please enter a product name for Product ${slot}`, 'warning');
      return;
    }

    const resultsContainer = document.getElementById(`compareSearchResults${slot}`);
    if (resultsContainer) {
      resultsContainer.innerHTML = `
        <div style="text-align: center; padding: 1.25rem; background: var(--color-surface-sunken); border-radius: var(--radius-md); margin-bottom: 0.75rem;">
          <div class="spinner"></div>
          <p style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--color-text-muted);">Searching Open Food Facts for "${query.trim()}"...</p>
        </div>
      `;
    }

    try {
      const data = await window.api.searchProducts(query.trim());
      
      if (data.status === 'partial_service') {
        if (resultsContainer) {
          resultsContainer.innerHTML = `
            <div class="alert alert-warning" style="margin-bottom: 0.75rem; font-size: 0.85rem; padding: 10px;">
              <div>
                <strong>Notice:</strong> ${data.warning || 'Search cluster busy. You can still look up by barcode.'}
              </div>
            </div>
          `;
        }
        return;
      }

      const products = data.products || [];
      if (slot === 'A') this.searchResultsA = products;
      else this.searchResultsB = products;

      this.renderSearchResults(slot, products, query.trim());
    } catch (err) {
      if (resultsContainer) {
        resultsContainer.innerHTML = `
          <div class="alert alert-warning" style="margin-bottom: 0.75rem; font-size: 0.85rem; padding: 10px;">
            <strong>Search Error:</strong> ${err.message || 'Unable to complete search.'}
          </div>
        `;
      }
    }
  }

  /**
   * Render the list of matching products found by name
   */
  renderSearchResults(slot, products, query) {
    const container = document.getElementById(`compareSearchResults${slot}`);
    if (!container) return;

    if (!products || products.length === 0) {
      container.innerHTML = `
        <div style="background: var(--color-surface-sunken); border-radius: var(--radius-md); padding: 1rem; text-align: center; margin-bottom: 0.75rem;">
          <p style="font-size: 0.85rem; color: var(--color-text-muted); margin-bottom: 4px;">No products found for "<strong>${query}</strong>"</p>
          <span style="font-size: 0.75rem; color: var(--color-text-subtle);">Try a different brand, generic term (e.g. "yogurt", "chocolate"), or use barcode lookup.</span>
        </div>
      `;
      return;
    }

    let html = `
      <div class="compare-search-results-list">
        <div style="padding: 6px 10px; font-size: 0.75rem; font-weight: 700; color: var(--color-text-muted); background: var(--color-surface-sunken); border-bottom: 1px solid var(--color-border); display: flex; justify-content: space-between; align-items: center;">
          <span>Found ${products.length} products for "${query}"</span>
          <a href="javascript:void(0)" onclick="document.getElementById('compareSearchResults${slot}').innerHTML=''" style="color: var(--color-text-muted); text-decoration: none; font-weight: 600;">✕ Close</a>
        </div>
    `;

    products.forEach((p, idx) => {
      const cal = p.nutrients100g && p.nutrients100g.calories !== null ? `${p.nutrients100g.calories} kcal` : 'Cal: N/A';
      const grade = p.nutriscoreGrade ? `<span class="badge-nutriscore nutriscore-${p.nutriscoreGrade.toLowerCase()}" style="font-size: 0.68rem; padding: 1px 6px;">${p.nutriscoreGrade.toUpperCase()}</span>` : '';
      const img = p.imageUrl 
        ? `<img src="${p.imageUrl}" alt="${p.productName}" style="width: 36px; height: 36px; object-fit: contain; border-radius: var(--radius-xs);">` 
        : `<span style="font-size: 1.3rem;">🥫</span>`;

      html += `
        <div class="compare-search-item">
          <div style="display: flex; align-items: center; gap: 10px; overflow: hidden; flex: 1;">
            <div style="width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; background: var(--color-surface-sunken); border-radius: var(--radius-sm); flex-shrink: 0; overflow: hidden;">
              ${img}
            </div>
            <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <div style="font-size: 0.85rem; font-weight: 700; color: var(--color-text-main); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${p.productName}">
                ${p.productName}
              </div>
              <div style="font-size: 0.75rem; color: var(--color-text-muted); display: flex; gap: 6px; align-items: center; margin-top: 1px;">
                <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;">${p.brand || 'Unbranded'}</span>
                <span>•</span>
                <span style="color: var(--color-calories); font-weight: 600;">${cal}</span>
                ${grade}
              </div>
            </div>
          </div>
          <button type="button" class="btn-accent" style="padding: 4px 10px; font-size: 0.75rem; flex-shrink: 0;" onclick="window.comparisonController.selectSearchResult('${slot}', ${idx})">
            Select
          </button>
        </div>
      `;
    });

    html += `</div>`;
    container.innerHTML = html;
  }

  /**
   * Select a product from the search results list
   */
  selectSearchResult(slot, index) {
    const list = slot === 'A' ? this.searchResultsA : this.searchResultsB;
    const product = list[index];
    if (!product) return;

    if (slot === 'A') {
      this.setProductA(product);
    } else {
      this.setProductB(product);
    }

    // Dismiss search results box
    const resultsContainer = document.getElementById(`compareSearchResults${slot}`);
    if (resultsContainer) resultsContainer.innerHTML = '';

    window.nutriGeniusApp?.showToast(`Selected for Product ${slot}: ${product.productName}`, 'success');
  }

  /**
   * Render product slot card preview
   */
  renderSlot(slot, product) {
    const container = document.getElementById(`compareSlot${slot}`);
    if (!container) return;

    if (!product) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 2rem;">
          <div class="empty-state-icon">📦</div>
          <p class="empty-state-desc">Select or lookup Product ${slot}</p>
        </div>
      `;
      return;
    }

    const n = product.nutrients100g || {};
    const gradeBadge = product.nutriscoreGrade 
      ? `<span class="badge-nutriscore nutriscore-${product.nutriscoreGrade.toLowerCase()}" style="margin-left: 6px;">Nutri-Score ${product.nutriscoreGrade.toUpperCase()}</span>` 
      : '';

    container.innerHTML = `
      <div style="background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; margin-top: 0.5rem; animation: fadeIn 200ms ease;">
        <div style="text-align: center; margin-bottom: 1rem;">
          <div style="height: 120px; display: flex; align-items: center; justify-content: center; background: var(--color-surface-sunken); border-radius: var(--radius-md); overflow: hidden; margin-bottom: 0.75rem;">
            ${product.imageUrl ? `<img src="${product.imageUrl}" alt="${product.productName}" style="max-height: 100%; max-width: 100%; object-fit: contain;">` : '<span style="font-size: 2.5rem;">🥫</span>'}
          </div>
          <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 4px; line-height: 1.3;">${product.productName}</h4>
          <p style="font-size: 0.8rem; color: var(--color-text-muted);">
            ${product.brand || 'Unbranded'} ${product.barcode ? `• Barcode: <code>${product.barcode}</code>` : ''} ${gradeBadge}
          </p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85rem;">
          <div style="background: var(--color-surface-sunken); padding: 8px 10px; border-radius: var(--radius-sm);">
            <span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">Calories</span>
            <strong>${n.calories !== null && n.calories !== undefined ? n.calories + ' kcal' : 'N/A'}</strong>
          </div>
          <div style="background: var(--color-surface-sunken); padding: 8px 10px; border-radius: var(--radius-sm);">
            <span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">Protein</span>
            <strong>${n.protein !== null && n.protein !== undefined ? n.protein + ' g' : 'N/A'}</strong>
          </div>
          <div style="background: var(--color-surface-sunken); padding: 8px 10px; border-radius: var(--radius-sm);">
            <span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">Sugars</span>
            <strong>${n.sugars !== null && n.sugars !== undefined ? n.sugars + ' g' : 'N/A'}</strong>
          </div>
          <div style="background: var(--color-surface-sunken); padding: 8px 10px; border-radius: var(--radius-sm);">
            <span style="color: var(--color-text-muted); font-size: 0.75rem; display: block;">Sat. Fat</span>
            <strong>${n.saturatedFat !== null && n.saturatedFat !== undefined ? n.saturatedFat + ' g' : 'N/A'}</strong>
          </div>
        </div>

        <button type="button" class="btn-secondary" style="width: 100%; margin-top: 12px; font-size: 0.8rem; padding: 7px 12px;" onclick="window.comparisonController.clearSlot('${slot}')">
          Change Product ${slot}
        </button>
      </div>
    `;
  }

  /**
   * Clear an assigned slot
   */
  clearSlot(slot) {
    if (slot === 'A') {
      this.productA = null;
      this.searchResultsA = [];
    } else {
      this.productB = null;
      this.searchResultsB = [];
    }
    this.updateSlotBadge(slot, false);
    this.renderSlot(slot, null);

    const resultBox = document.getElementById('comparisonResultBox');
    if (resultBox) resultBox.innerHTML = '';
  }

  setPriority(newPriority) {
    this.priority = newPriority;
    document.querySelectorAll('[data-compare-priority]').forEach(btn => {
      if (btn.getAttribute('data-compare-priority') === newPriority) {
        btn.classList.add('btn-accent');
        btn.classList.remove('btn-secondary');
      } else {
        btn.classList.remove('btn-accent');
        btn.classList.add('btn-secondary');
      }
    });
    this.triggerComparisonIfReady();
  }

  triggerComparisonIfReady() {
    if (!this.productA || !this.productB) return;

    const payloadA = { name: this.productA.productName, ...this.productA.nutrients100g };
    const payloadB = { name: this.productB.productName, ...this.productB.nutrients100g };

    const resultBox = document.getElementById('comparisonResultBox');
    if (!resultBox) return;

    try {
      const result = window.nutriGeniusRanking 
        ? window.nutriGeniusRanking.compare(payloadA, payloadB, this.priority)
        : this.localCompare(payloadA, payloadB, this.priority);

      this.renderComparisonResult(result);
    } catch (err) {
      console.error('Comparison error:', err);
    }
  }

  localCompare(a, b, priority) {
    const weights = {
      balanced:     { protein: 1.5, sugar: -1.5, fiber: 1.2, saturatedFat: -1.0, calories: -0.5 },
      low_sugar:    { protein: 1.0, sugar: -3.0, fiber: 1.0, saturatedFat: -1.0, calories: -1.0 },
      high_protein: { protein: 3.0, sugar: -1.0, fiber: 1.0, saturatedFat: -1.0, calories: 0.0 },
      low_calories: { protein: 1.0, sugar: -1.5, fiber: 1.0, saturatedFat: -1.0, calories: -2.5 },
      low_fat:      { protein: 1.0, sugar: -1.0, fiber: 1.0, saturatedFat: -3.0, calories: -1.5 }
    }[priority] || {};

    let scoreA = 0;
    let scoreB = 0;
    const metrics = [
      { key: 'calories', label: 'Calories', unit: 'kcal' },
      { key: 'protein', label: 'Protein', unit: 'g' },
      { key: 'carbohydrates', label: 'Carbohydrates', unit: 'g' },
      { key: 'sugars', label: 'Sugars', unit: 'g' },
      { key: 'fat', label: 'Total Fat', unit: 'g' },
      { key: 'saturatedFat', label: 'Saturated Fat', unit: 'g' },
      { key: 'fiber', label: 'Fiber', unit: 'g' }
    ];

    const rows = metrics.map(m => {
      const valA = a[m.key];
      const valB = b[m.key];
      const hasA = valA !== null && valA !== undefined && !isNaN(Number(valA));
      const hasB = valB !== null && valB !== undefined && !isNaN(Number(valB));

      let advantage = 'neutral';
      if (hasA && hasB) {
        const weight = weights[m.key] || (m.key === 'sugars' || m.key === 'saturatedFat' ? -1 : 1);
        const diff = (Number(valA) - Number(valB)) * weight;
        if (diff > 0) { scoreA += Math.abs(diff); advantage = 'A'; }
        else if (diff < 0) { scoreB += Math.abs(diff); advantage = 'B'; }
      }

      return {
        label: m.label,
        unit: m.unit,
        valA: hasA ? Number(valA) : 'N/A',
        valB: hasB ? Number(valB) : 'N/A',
        advantage
      };
    });

    return {
      scoreA: Number(scoreA.toFixed(1)),
      scoreB: Number(scoreB.toFixed(1)),
      winner: scoreA > scoreB ? 'A' : scoreB > scoreA ? 'B' : 'Draw',
      priority,
      rows
    };
  }

  renderComparisonResult(res) {
    const resultBox = document.getElementById('comparisonResultBox');
    if (!resultBox) return;

    const winnerName = res.winner === 'A' ? this.productA.productName : res.winner === 'B' ? this.productB.productName : 'Both Products (Tie)';

    resultBox.innerHTML = `
      <div class="dashboard-card" style="margin-top: 1.5rem; animation: fadeIn 250ms ease;">
        <div style="text-align: center; padding: 1.5rem; background: var(--color-primary-light); border-radius: var(--radius-md); margin-bottom: 1.5rem; border: 1px solid var(--color-primary-border);">
          <span style="font-size: 0.85rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-primary-hover);">
            Priority Profile: ${res.priority.replace('_', ' ').toUpperCase()}
          </span>
          <h3 style="font-size: 1.6rem; font-weight: 800; color: var(--color-text-main); margin: 6px 0;">
            🏆 Recommended: ${winnerName}
          </h3>
          <p style="font-size: 0.9rem; color: var(--color-text-muted); max-width: 600px; margin: 0 auto;">
            Score: Product A <strong>(${res.scoreA} pts)</strong> vs Product B <strong>(${res.scoreB} pts)</strong> based on reported 100g values.
          </p>
        </div>

        <h4 style="font-size: 1.05rem; font-weight: 700; margin-bottom: 0.75rem;">Nutrient Breakdown (Per 100g)</h4>
        <div style="overflow-x: auto;">
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem;">
            <thead>
              <tr style="border-bottom: 2px solid var(--color-border); color: var(--color-text-muted);">
                <th style="padding: 10px;">Nutrient</th>
                <th style="padding: 10px;">${this.productA.productName}</th>
                <th style="padding: 10px;">${this.productB.productName}</th>
                <th style="padding: 10px; text-align: right;">Advantage</th>
              </tr>
            </thead>
            <tbody>
              ${res.rows.map(r => `
                <tr style="border-bottom: 1px solid var(--color-border);">
                  <td style="padding: 10px; font-weight: 600;">${r.label}</td>
                  <td style="padding: 10px; ${r.advantage === 'A' ? 'font-weight: 800; color: var(--color-primary);' : ''}">${r.valA} ${r.valA !== 'N/A' ? r.unit : ''}</td>
                  <td style="padding: 10px; ${r.advantage === 'B' ? 'font-weight: 800; color: var(--color-primary);' : ''}">${r.valB} ${r.valB !== 'N/A' ? r.unit : ''}</td>
                  <td style="padding: 10px; text-align: right;">
                    ${r.advantage === 'A' ? `<span style="padding: 2px 8px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); font-size: 0.75rem; font-weight: 700;">Favors Product A</span>` :
                      r.advantage === 'B' ? `<span style="padding: 2px 8px; border-radius: var(--radius-full); background: var(--color-primary-light); color: var(--color-primary); font-size: 0.75rem; font-weight: 700;">Favors Product B</span>` :
                      `<span style="color: var(--color-text-subtle); font-size: 0.75rem;">Equal / N/A</span>`}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div style="margin-top: 1rem; font-size: 0.8rem; color: var(--color-text-muted); background: var(--color-surface-sunken); padding: 10px; border-radius: var(--radius-sm);">
          ℹ️ <strong>Transparent Algorithm Note:</strong> Missing nutrient values are excluded from scoring calculations to avoid penalizing products with incomplete disclosures. This heuristic ranking does not constitute clinical dietary endorsement.
        </div>
      </div>
    `;
  }
}

// Global instance
window.comparisonController = new ComparisonController();
