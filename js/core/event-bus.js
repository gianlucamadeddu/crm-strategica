// Event Bus per CRM Strategica
// =============================
// Sistema di eventi per comunicazione tra moduli

const EventBus = {
  events: {},

  /**
   * Registra un listener per un evento
   * @param {string} event - Nome evento
   * @param {function} callback - Funzione da eseguire
   */
  on(event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  },

  /**
   * Emette un evento con dati opzionali
   * @param {string} event - Nome evento
   * @param {*} data - Dati da passare ai listener
   */
  emit(event, data) {
    if (this.events[event]) {
      this.events[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`EventBus error in "${event}":`, e);
        }
      });
    }
  },

  /**
   * Rimuove un listener specifico
   * @param {string} event - Nome evento
   * @param {function} callback - Funzione da rimuovere
   */
  off(event, callback) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
  },

  /**
   * Rimuove tutti i listener di un evento
   * @param {string} event - Nome evento
   */
  clear(event) {
    if (event) {
      delete this.events[event];
    } else {
      this.events = {};
    }
  }
};

// Eventi standard del CRM
const CRM_EVENTS = {
  USER_LOGIN: 'user:login',
  USER_LOGOUT: 'user:logout',
  MODULE_CHANGE: 'module:change',
  DATA_UPDATE: 'data:update',
  NOTIFICATION: 'notification:show',
  CLIENTE_CREATED: 'cliente:created',
  CLIENTE_UPDATED: 'cliente:updated',
  STATO_CHANGED: 'stato:changed'
};

// Export globale
window.EventBus = EventBus;
window.CRM_EVENTS = CRM_EVENTS;
