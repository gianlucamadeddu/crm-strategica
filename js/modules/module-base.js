// CRM Strategica - Module Base
// ============================
// Classe base per tutti i moduli del CRM

class ModuleBase {
  constructor(containerId = 'module-container') {
    this.container = document.getElementById(containerId);
    this.currentUser = null;
  }

  async init() {
    this.currentUser = AuthManager.getCurrentUser();
    if (!this.currentUser) {
      console.error('Utente non autenticato');
      return;
    }
    await this.loadData();
    this.render();
    this.bindEvents();
  }

  async loadData() {
    // Override nei moduli figli
  }

  render() {
    // Override nei moduli figli
  }

  bindEvents() {
    // Override nei moduli figli
  }

  checkPermission(requiredRole) {
    if (!this.currentUser) return false;
    
    const roleHierarchy = {
      'admin': 3,
      'team_manager': 2,
      'consulente': 1
    };
    
    return roleHierarchy[this.currentUser.ruolo] >= roleHierarchy[requiredRole];
  }

  isAdmin() {
    return this.currentUser?.ruolo === 'admin';
  }

  isTeamManager() {
    return this.currentUser?.ruolo === 'team_manager';
  }

  isConsulente() {
    return this.currentUser?.ruolo === 'consulente';
  }

  showLoading() {
    this.container.innerHTML = `
      <div class="module-loading">
        <div class="spinner"></div>
        <p>Caricamento...</p>
      </div>
    `;
  }

  showError(message) {
    this.container.innerHTML = `
      <div class="module-error">
        <p>${message}</p>
      </div>
    `;
  }

  showToast(message, type = 'info') {
    App.showToast(message, type);
  }
}

// Export globale
window.ModuleBase = ModuleBase;
