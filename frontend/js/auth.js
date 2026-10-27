/**
 * NutriGenius AI — Authentication & User State Controller
 * Manages Supabase Auth credentials, guest mode, and user profile state.
 */
class AuthController {
  constructor() {
    this.currentUser = null;
    this.isSupabaseConfigured = false;
    this.init();
  }

  init() {
    this.checkStoredSession();
    this.updateAuthUI();
  }

  checkStoredSession() {
    try {
      const user = localStorage.getItem('nutrigenius_user');
      if (user) {
        this.currentUser = JSON.parse(user);
      }
    } catch {
      this.currentUser = null;
    }
  }

  updateAuthUI() {
    const authBtn = document.getElementById('authNavButton');
    if (!authBtn) return;

    if (this.currentUser) {
      authBtn.textContent = `👤 ${this.currentUser.email.split('@')[0]}`;
      authBtn.onclick = () => this.showUserModal();
    } else {
      authBtn.textContent = 'Sign In';
      authBtn.onclick = () => { window.location.href = 'login.html'; };
    }
  }

  showUserModal() {
    const email = this.currentUser ? this.currentUser.email : 'Guest';
    const isConfirmed = confirm(`Logged in as: ${email}\n\nDo you want to log out?`);
    if (isConfirmed) {
      this.logout();
    }
  }

  logout() {
    localStorage.removeItem('nutrigenius_user');
    localStorage.removeItem('nutrigenius_auth_token');
    this.currentUser = null;
    this.updateAuthUI();

    if (window.nutriGeniusApp) {
      window.nutriGeniusApp.showToast('You have been logged out.', 'info');
    }
  }

  demoLogin(email = 'student@example.com') {
    this.currentUser = {
      id: 'demo-user-1234',
      email: email,
      isDemo: true,
      created_at: new Date().toISOString()
    };
    localStorage.setItem('nutrigenius_user', JSON.stringify(this.currentUser));
    localStorage.setItem('nutrigenius_auth_token', 'demo-token');
    this.updateAuthUI();
  }
}

window.authController = new AuthController();
