// Storage Wrapper per CRM Strategica
// ===================================
// Gestisce localStorage con prefisso 'crm_'

const StorageWrapper = {
  prefix: 'crm_',

  /**
   * Recupera un valore dal localStorage
   * @param {string} key - Chiave senza prefisso
   * @returns {*} Valore parsato o null
   */
  get(key) {
    try {
      const data = localStorage.getItem(this.prefix + key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('StorageWrapper.get error:', e);
      return null;
    }
  },

  /**
   * Salva un valore nel localStorage
   * @param {string} key - Chiave senza prefisso
   * @param {*} value - Valore da salvare (verrà serializzato)
   */
  set(key, value) {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      console.error('StorageWrapper.set error:', e);
    }
  },

  /**
   * Rimuove un valore dal localStorage
   * @param {string} key - Chiave senza prefisso
   */
  remove(key) {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (e) {
      console.error('StorageWrapper.remove error:', e);
    }
  },

  /**
   * Pulisce tutti i dati del CRM dal localStorage
   */
  clear() {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (e) {
      console.error('StorageWrapper.clear error:', e);
    }
  }
};

// Export globale
window.StorageWrapper = StorageWrapper;
