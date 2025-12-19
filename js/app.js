// CRM Strategica - App.js
// ========================
// Inizializzazione e gestione principale dell'applicazione

const App = {
  currentModule: null,

  /**
   * Inizializza l'applicazione
   */
  async init() {
    console.log('🚀 CRM Strategica - Inizializzazione...');
    
    // Inizializza Firebase
    if (!window.FirebaseConfig.init()) {
      console.error('Impossibile inizializzare Firebase');
      return;
    }

    // Setup event listeners
    this.setupEventListeners();

    // Controlla se utente già loggato
    if (AuthManager.isLoggedIn()) {
      this.showApp();
    } else {
      this.showLogin();
    }

    console.log('✅ CRM Strategica - Pronto!');
  },

  /**
   * Setup degli event listener globali
   */
  setupEventListeners() {
    // Form login
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', (e) => this.handleLogin(e));
    }

    // Logout button
    document.addEventListener('click', (e) => {
      if (e.target.closest('#btn-logout')) {
        this.handleLogout();
      }
    });

    // Navigation
    document.addEventListener('click', (e) => {
      const navItem = e.target.closest('.nav-item[data-module]');
      if (navItem) {
        const module = navItem.dataset.module;
        this.navigateTo(module);
      }
    });

    // Event bus listeners
    EventBus.on(CRM_EVENTS.USER_LOGIN, (user) => {
      this.showApp();
    });

    EventBus.on(CRM_EVENTS.USER_LOGOUT, () => {
      this.showLogin();
    });
  },

  /**
   * Gestisce il submit del form login
   */
  async handleLogin(e) {
    e.preventDefault();
    
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    
    // Reset error
    errorDiv.classList.remove('show');
    errorDiv.textContent = '';
    
    // Disable button
    submitBtn.disabled = true;
    submitBtn.textContent = 'Accesso in corso...';

    try {
      const result = await AuthManager.login(email, password);
      
      if (result.success) {
        // Login OK - EventBus gestirà la UI
      } else {
        errorDiv.textContent = result.error;
        errorDiv.classList.add('show');
      }
    } catch (error) {
      errorDiv.textContent = 'Errore durante il login';
      errorDiv.classList.add('show');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Accedi';
    }
  },

  /**
   * Gestisce il logout
   */
  handleLogout() {
    AuthManager.logout();
  },

  /**
   * Mostra la pagina di login
   */
  showLogin() {
    document.getElementById('login-page').style.display = 'flex';
    document.getElementById('app-container').classList.remove('active');
    
    // Reset form
    const form = document.getElementById('login-form');
    if (form) form.reset();
    
    const errorDiv = document.getElementById('login-error');
    if (errorDiv) errorDiv.classList.remove('show');
  },

  /**
   * Mostra l'applicazione principale
   */
  showApp() {
    document.getElementById('login-page').style.display = 'none';
    document.getElementById('app-container').classList.add('active');
    
    // Aggiorna info utente
    this.updateUserInfo();
    
    // Filtra menu per ruolo
    this.filterMenuByRole();
    
    // Carica modulo default
    this.navigateTo('dashboard');
  },

  /**
   * Aggiorna le info utente nella sidebar
   */
  updateUserInfo() {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    const userNameEl = document.getElementById('user-name');
    const userRoleEl = document.getElementById('user-role');
    const userAvatarEl = document.getElementById('user-avatar');

    if (userNameEl) {
      userNameEl.textContent = `${user.nome} ${user.cognome}`;
    }
    
    if (userRoleEl) {
      const roleLabels = {
        'admin': 'Amministratore',
        'team_manager': 'Team Manager',
        'consulente': 'Consulente'
      };
      userRoleEl.textContent = roleLabels[user.ruolo] || user.ruolo;
    }

    if (userAvatarEl) {
      userAvatarEl.textContent = user.nome.charAt(0) + user.cognome.charAt(0);
    }
  },

  /**
   * Filtra le voci di menu in base al ruolo
   */
  filterMenuByRole() {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    // Impostazioni visibile solo per admin
    const settingsItem = document.querySelector('.nav-item[data-module="impostazioni"]');
    if (settingsItem) {
      if (user.ruolo === 'admin') {
        settingsItem.style.display = 'flex';
      } else {
        settingsItem.style.display = 'none';
      }
    }
  },

  /**
   * Naviga a un modulo
   */
  navigateTo(moduleName) {
    // Aggiorna stato attivo nel menu
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.remove('active');
    });
    
    const activeItem = document.querySelector(`.nav-item[data-module="${moduleName}"]`);
    if (activeItem) {
      activeItem.classList.add('active');
    }

    // Aggiorna titolo
    const titles = {
      'dashboard': 'Dashboard',
      'clienti': 'Clienti',
      'appuntamenti': 'Appuntamenti',
      'messaggi': 'Messaggi',
      'comunicazioni': 'Comunicazioni',
      'impostazioni': 'Impostazioni'
    };
    
    const titleEl = document.getElementById('content-title');
    if (titleEl) {
      titleEl.textContent = titles[moduleName] || moduleName;
    }

    // Carica contenuto modulo
    this.loadModule(moduleName);
    
    // Emetti evento
    EventBus.emit(CRM_EVENTS.MODULE_CHANGE, moduleName);
    
    this.currentModule = moduleName;
  },

  /**
   * Carica il contenuto di un modulo
   */
  loadModule(moduleName) {
    const container = document.getElementById('module-container');
    if (!container) return;

    // Cleanup modulo precedente
    if (this.currentModule === 'dashboard' && window.DashboardModule) {
      DashboardModule.cleanup();
    }
    if (this.currentModule === 'clienti' && window.ClientiModule) {
      ClientiModule.cleanup();
    }
    if (this.currentModule === 'appuntamenti' && window.AppuntamentiModule) {
      AppuntamentiModule.cleanup();
    }
    if (this.currentModule === 'impostazioni' && window.ImpostazioniModule) {
      ImpostazioniModule.cleanup();
    }
    if (this.currentModule === 'messaggi' && window.MessaggiModule) {
  MessaggiModule.cleanup();
    }
    if (this.currentModule === 'comunicazioni' && window.ComunicazioniModule) {
     ComunicazioniModule.cleanup();
    }

    // Carica il modulo richiesto
    switch (moduleName) {
      case 'dashboard':
        if (window.DashboardModule) {
          DashboardModule.init();
        } else {
          this.showModulePlaceholder(container, moduleName);
        }
        break;

      case 'clienti':
        if (window.ClientiModule) {
          ClientiModule.init();
        } else {
          this.showModulePlaceholder(container, moduleName);
        }
        break;

      case 'appuntamenti':
        if (window.AppuntamentiModule) {
          AppuntamentiModule.init();
        } else {
          this.showModulePlaceholder(container, moduleName);
        }
        break;

      case 'impostazioni':
        if (window.ImpostazioniModule) {
          ImpostazioniModule.init();
        } else {
          this.showModulePlaceholder(container, moduleName);
        }
        break;
        
        case 'messaggi':
        if (window.MessaggiModule) {
          MessaggiModule.init();
        } else {
          this.showModulePlaceholder(container, moduleName);
        }
        break;
        
      case 'comunicazioni':
     if (window.ComunicazioniModule) {
       ComunicazioniModule.init();
     } else {
       this.showModulePlaceholder(container, moduleName);
     }
     break;

      default:
        this.showModulePlaceholder(container, moduleName);
        break;
    }
  },

  /**
   * Mostra placeholder per moduli non ancora implementati
   */
  showModulePlaceholder(container, moduleName) {
    const icons = {
      'dashboard': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" /></svg>',
      'clienti': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>',
      'appuntamenti': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" /></svg>',
      'messaggi': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" /></svg>',
      'comunicazioni': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>',
      'impostazioni': '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'
    };

    container.innerHTML = `
      <div class="module-placeholder">
        ${icons[moduleName] || icons['dashboard']}
        <div class="module-placeholder-title">Modulo ${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}</div>
        <div class="module-placeholder-text">Coming soon...</div>
      </div>
    `;
  },

  /**
   * Mostra una notifica toast
   */
  showToast(message, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 4000);
  }
};

// Inizializza quando il DOM è pronto
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

// Export globale
window.App = App;
