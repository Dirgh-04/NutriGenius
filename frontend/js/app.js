/**
 * NutriGenius AI — Core Application Router & UI Controller
 */
class NutriGeniusApp {
  constructor() {
    this.currentView = 'dashboard';
    this.statusCheckInterval = null;
    this.isBackendOnline = false;
  }

  init() {
    this.setupNavigation();
    this.setupHealthMonitoring();
    this.setupMobileMenu();
    this.setupToastContainer();

    // Check URL hash for initial view routing
    const initialView = window.location.hash.replace('#', '') || 'dashboard';
    this.navigate(initialView);

    console.log(`[NutriGenius] Initialized v${window.CONFIG ? window.CONFIG.APP_VERSION : '1.0'}`);
  }

  /**
   * Navigation router between application tabs
   */
  setupNavigation() {
    const navButtons = document.querySelectorAll('[data-nav-target]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetView = e.currentTarget.getAttribute('data-nav-target');
        this.navigate(targetView);
      });
    });

    window.addEventListener('hashchange', () => {
      const view = window.location.hash.replace('#', '');
      if (view) this.navigate(view, false);
    });
  }

  navigate(viewName, updateHash = true) {
    const targetElement = document.getElementById(`view-${viewName}`);
    if (!targetElement) {
      console.warn(`View "view-${viewName}" not found. Defaulting to dashboard.`);
      viewName = 'dashboard';
    }

    // Hide all views
    document.querySelectorAll('.app-view').forEach(view => {
      view.classList.remove('active-view');
    });

    // Show target view
    const activeViewEl = document.getElementById(`view-${viewName}`);
    if (activeViewEl) {
      activeViewEl.classList.add('active-view');
    }

    // Update nav active states
    document.querySelectorAll('[data-nav-target]').forEach(btn => {
      if (btn.getAttribute('data-nav-target') === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    this.currentView = viewName;
    if (updateHash) {
      window.location.hash = viewName;
    }

    // Close mobile nav menu if open
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) navLinks.classList.remove('nav-open');

    // Trigger view-specific controller hooks
    this.onViewActivated(viewName);
  }

  onViewActivated(viewName) {
    if (viewName === 'dashboard' && window.dashboardController) {
      window.dashboardController.render();
    } else if (viewName === 'fruits' && window.fruitController) {
      window.fruitController.init();
    } else if (viewName === 'nutrition' && window.nutritionTrackerController) {
      window.nutritionTrackerController.init();
    } else if (viewName === 'comparison' && window.comparisonController) {
      window.comparisonController.triggerComparisonIfReady();
    }
  }

  /**
   * Live Backend Health Status Poller
   */
  setupHealthMonitoring() {
    const checkStatus = async () => {
      const pill = document.getElementById('backendStatusPill');
      const text = document.getElementById('backendStatusText');
      if (!pill || !text) return;

      try {
        pill.className = 'status-pill checking';
        text.textContent = 'Checking...';

        const health = await window.api.checkHealth();
        if (health && health.status === 'OK') {
          this.isBackendOnline = true;
          pill.className = 'status-pill online';
          text.textContent = 'Backend Online';
          pill.title = `Backend running (Uptime: ${health.uptimeSeconds}s)`;
        } else {
          throw new Error('Unexpected health response');
        }
      } catch (err) {
        console.warn('[NutriGenius Health Check Error]:', err);
        this.isBackendOnline = false;
        pill.className = 'status-pill offline';
        text.textContent = 'Backend Offline';
        pill.title = `Backend unreachable on ${window.api.baseUrl}: ${err.message}`;
      }
    };

    // Initial check
    checkStatus();

    // Periodic check every 30 seconds
    const intervalMs = (window.CONFIG && window.CONFIG.HEALTH_CHECK_INTERVAL_MS) || 30000;
    this.statusCheckInterval = setInterval(checkStatus, intervalMs);

    // Click on status pill to manually refresh
    const pill = document.getElementById('backendStatusPill');
    if (pill) {
      pill.addEventListener('click', () => {
        checkStatus();
        this.showToast('Checking backend connection...', 'info');
      });
    }
  }

  /**
   * Mobile menu toggle
   */
  setupMobileMenu() {
    const toggleBtn = document.getElementById('mobileMenuToggle');
    const navLinks = document.querySelector('.nav-links');
    if (toggleBtn && navLinks) {
      toggleBtn.addEventListener('click', () => {
        navLinks.classList.toggle('nav-open');
      });
    }
  }

  /**
   * Toast notification system
   */
  setupToastContainer() {
    if (!document.getElementById('toastContainer')) {
      const container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
  }

  showToast(message, type = 'info', durationMs = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const iconMap = {
      success: '✓',
      error: '✕',
      info: 'ℹ',
      warning: '⚠'
    };

    toast.innerHTML = `
      <span style="font-weight: bold; font-size: 1.1rem;">${iconMap[type] || 'ℹ'}</span>
      <div style="flex: 1;">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, durationMs);
  }
}

// Initialize on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.nutriGeniusApp = new NutriGeniusApp();
  window.nutriGeniusApp.init();
});
