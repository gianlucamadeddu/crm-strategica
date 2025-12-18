// Auth Manager per CRM Strategica
// ================================
// Gestisce autenticazione locale (no Firebase Auth)

const AuthManager = {
  
  // Credenziali Admin hardcoded
  ADMIN_CREDENTIALS: {
    email: 'monkeynsleeps@gmail.com',
    password: 'strategica@2025',
    userData: {
      id: 'admin-001',
      email: 'monkeynsleeps@gmail.com',
      nome: 'Admin',
      cognome: 'Strategica',
      ruolo: 'admin',
      teamManagerId: null,
      attivo: true
    }
  },

  /**
   * Tenta il login con email e password
   * @param {string} email 
   * @param {string} password 
   * @returns {Promise<{success: boolean, user?: object, error?: string}>}
   */
  async login(email, password) {
    // Normalizza email
    email = email.trim().toLowerCase();
    
    // 1. Controlla se è l'admin hardcoded
    if (email === this.ADMIN_CREDENTIALS.email.toLowerCase() && 
        password === this.ADMIN_CREDENTIALS.password) {
      
      const user = { ...this.ADMIN_CREDENTIALS.userData };
      this.setSession(user);
      EventBus.emit(CRM_EVENTS.USER_LOGIN, user);
      return { success: true, user };
    }
    
    // 2. Cerca tra gli utenti in Firestore
    try {
      const db = window.FirebaseConfig.getDb();
      if (!db) {
        return { success: false, error: 'Database non disponibile' };
      }

      const snapshot = await db.collection('users')
        .where('email', '==', email)
        .where('attivo', '==', true)
        .get();

      if (snapshot.empty) {
        return { success: false, error: 'Email o password non validi' };
      }

      const userDoc = snapshot.docs[0];
      const userData = userDoc.data();

      // Verifica password (salvata in chiaro per semplicità)
      if (userData.password !== password) {
        return { success: false, error: 'Email o password non validi' };
      }

      // Login riuscito
      const user = {
        id: userDoc.id,
        email: userData.email,
        nome: userData.nome,
        cognome: userData.cognome,
        ruolo: userData.ruolo,
        teamManagerId: userData.teamManagerId || null,
        attivo: userData.attivo
      };

      this.setSession(user);
      EventBus.emit(CRM_EVENTS.USER_LOGIN, user);
      return { success: true, user };

    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Errore durante il login' };
    }
  },

  /**
   * Esegue il logout
   */
  logout() {
    StorageWrapper.remove('currentUser');
    EventBus.emit(CRM_EVENTS.USER_LOGOUT);
  },

  /**
   * Salva la sessione utente
   * @param {object} user 
   */
  setSession(user) {
    // Non salviamo la password nella sessione
    const sessionData = {
      id: user.id,
      email: user.email,
      nome: user.nome,
      cognome: user.cognome,
      ruolo: user.ruolo,
      teamManagerId: user.teamManagerId
    };
    StorageWrapper.set('currentUser', sessionData);
  },

  /**
   * Recupera l'utente corrente dalla sessione
   * @returns {object|null}
   */
  getCurrentUser() {
    return StorageWrapper.get('currentUser');
  },

  /**
   * Verifica se l'utente è loggato
   * @returns {boolean}
   */
  isLoggedIn() {
    return this.getCurrentUser() !== null;
  },

  /**
   * Verifica se l'utente ha un determinato ruolo
   * @param {string|string[]} roles - Ruolo o array di ruoli
   * @returns {boolean}
   */
  hasRole(roles) {
    const user = this.getCurrentUser();
    if (!user) return false;
    
    if (Array.isArray(roles)) {
      return roles.includes(user.ruolo);
    }
    return user.ruolo === roles;
  },

  /**
   * Verifica se l'utente è admin
   * @returns {boolean}
   */
  isAdmin() {
    return this.hasRole('admin');
  },

  /**
   * Verifica se l'utente è team manager
   * @returns {boolean}
   */
  isTeamManager() {
    return this.hasRole('team_manager');
  },

  /**
   * Verifica se l'utente è consulente
   * @returns {boolean}
   */
  isConsulente() {
    return this.hasRole('consulente');
  }
};

// Export globale
window.AuthManager = AuthManager;
