// CRM Strategica - Dashboard Module
// ==================================
// Modulo dashboard con statistiche, pratiche e appuntamenti

const DashboardModule = {
  
  // Riferimenti ai listener Firebase per cleanup
  unsubscribers: [],

  /**
   * Inizializza e renderizza la dashboard
   */
  async init() {
    console.log('📊 Dashboard - Inizializzazione...');
    
    // Renderizza la struttura HTML
    this.render();
    
    // Carica i dati in tempo reale
    this.setupRealtimeListeners();
    
    console.log('✅ Dashboard - Pronta!');
  },

  /**
   * Pulisce i listener quando si cambia modulo
   */
  cleanup() {
    this.unsubscribers.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];
    console.log('🧹 Dashboard - Cleanup completato');
  },

  /**
   * Renderizza la struttura HTML della dashboard
   */
  render() {
    const container = document.getElementById('module-container');
    if (!container) return;

    container.innerHTML = `
      <div class="dashboard">
        
        <!-- Stat Cards -->
        <div class="stats-grid">
          
          <!-- Clienti Totali -->
          <div class="stat-card">
            <div class="stat-icon stat-icon-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Clienti Totali</div>
              <div id="stat-clienti" class="stat-value">
                <span class="stat-loading"></span>
              </div>
            </div>
          </div>

          <!-- Appuntamenti Oggi -->
          <div class="stat-card">
            <div class="stat-icon stat-icon-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Appuntamenti Oggi</div>
              <div id="stat-appuntamenti" class="stat-value">
                <span class="stat-loading"></span>
              </div>
            </div>
          </div>

          <!-- Pratiche Completate -->
          <div class="stat-card">
            <div class="stat-icon stat-icon-success">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">Completati</div>
              <div id="stat-completati" class="stat-value">
                <span class="stat-loading"></span>
              </div>
            </div>
          </div>

          <!-- Pratiche In Attesa -->
          <div class="stat-card">
            <div class="stat-icon stat-icon-warning">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="stat-content">
              <div class="stat-label">In Attesa</div>
              <div id="stat-attesa" class="stat-value">
                <span class="stat-loading"></span>
              </div>
            </div>
          </div>

        </div>

        <!-- Contenuto principale -->
        <div class="dashboard-content">
          
          <!-- Colonna sinistra: Pratiche Recenti -->
          <div class="dashboard-column">
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  Pratiche Recenti
                </h3>
              </div>
              <div class="card-body">
                <div id="lista-pratiche" class="lista-items">
                  <div class="loading-placeholder">
                    <span class="stat-loading"></span>
                    <span>Caricamento...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Colonna destra: Appuntamenti Oggi + Notifiche -->
          <div class="dashboard-column">
            
            <!-- Appuntamenti del giorno -->
            <div class="card">
              <div class="card-header">
                <h3 class="card-title">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Appuntamenti Oggi
                </h3>
              </div>
              <div class="card-body">
                <div id="lista-appuntamenti" class="lista-items">
                  <div class="loading-placeholder">
                    <span class="stat-loading"></span>
                    <span>Caricamento...</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Badge Notifiche -->
            <div class="card card-notifiche">
              <div class="card-header">
                <h3 class="card-title">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
                  </svg>
                  Comunicazioni
                  <span id="badge-notifiche" class="badge badge-danger" style="display: none;">0</span>
                </h3>
              </div>
              <div class="card-body">
                <div id="lista-notifiche" class="lista-items">
                  <div class="loading-placeholder">
                    <span class="stat-loading"></span>
                    <span>Caricamento...</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>
    `;
  },

  /**
   * Configura i listener real-time Firebase
   */
  setupRealtimeListeners() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      console.error('Database non disponibile');
      this.showError();
      return;
    }

    // Carica statistiche e liste
    this.loadClienti(db);
    this.loadAppuntamenti(db);
    this.loadPratiche(db);
    this.loadComunicazioni(db);
  },

  /**
   * Ottiene il filtro query in base al ruolo utente
   */
  getRoleFilter() {
    const user = AuthManager.getCurrentUser();
    if (!user) return null;

    return {
      ruolo: user.ruolo,
      oderId: user.id,
      teamManagerId: user.teamManagerId
    };
  },

  /**
   * Applica filtro ruolo alla query
   */
  applyRoleFilter(query, fieldConsulente = 'consulenteId', fieldTeamManager = 'teamManagerId') {
    const user = AuthManager.getCurrentUser();
    if (!user) return query;

    switch (user.ruolo) {
      case 'admin':
        // Admin vede tutto
        return query;
      
      case 'team_manager':
        // Team Manager vede la sua rete (i suoi consulenti)
        // Prima ottiene tutti i clienti dove lui è TM o dove i consulenti sono suoi
        return query.where(fieldTeamManager, '==', user.id);
      
      case 'consulente':
        // Consulente vede solo i suoi
        return query.where(fieldConsulente, '==', user.id);
      
      default:
        return query;
    }
  },

  /**
   * Carica conteggio clienti
   */
  loadClienti(db) {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    let query = db.collection('clienti');
    
    // Applica filtro ruolo
    if (user.ruolo === 'team_manager') {
      query = query.where('teamManagerId', '==', user.id);
    } else if (user.ruolo === 'consulente') {
      query = query.where('consulenteId', '==', user.id);
    }

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        const count = snapshot.size;
        document.getElementById('stat-clienti').textContent = count;
      },
      (error) => {
        console.error('Errore caricamento clienti:', error);
        document.getElementById('stat-clienti').textContent = '0';
      }
    );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Carica appuntamenti di oggi
   */
  loadAppuntamenti(db) {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    // Date di oggi (inizio e fine giornata)
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    const domani = new Date(oggi);
    domani.setDate(domani.getDate() + 1);

    let query = db.collection('appuntamenti')
      .where('data', '>=', oggi)
      .where('data', '<', domani)
      .orderBy('data', 'asc');

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        // Filtra per ruolo dopo aver ricevuto i dati
        let appuntamenti = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          
          // Filtro per ruolo
          if (user.ruolo === 'admin') {
            appuntamenti.push(data);
          } else if (user.ruolo === 'team_manager' && data.teamManagerId === user.id) {
            appuntamenti.push(data);
          } else if (user.ruolo === 'consulente' && data.consulenteId === user.id) {
            appuntamenti.push(data);
          }
        });

        // Aggiorna contatore
        document.getElementById('stat-appuntamenti').textContent = appuntamenti.length;
        
        // Aggiorna lista
        this.renderAppuntamenti(appuntamenti);
      },
      (error) => {
        console.error('Errore caricamento appuntamenti:', error);
        document.getElementById('stat-appuntamenti').textContent = '0';
        this.renderAppuntamenti([]);
      }
    );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Carica pratiche recenti con stati
   */
  loadPratiche(db) {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    let query = db.collection('pratiche')
      .orderBy('dataAggiornamento', 'desc')
      .limit(10);

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        let pratiche = [];
        let completati = 0;
        let inAttesa = 0;

        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          
          // Filtro per ruolo
          let include = false;
          if (user.ruolo === 'admin') {
            include = true;
          } else if (user.ruolo === 'team_manager' && data.teamManagerId === user.id) {
            include = true;
          } else if (user.ruolo === 'consulente' && data.consulenteId === user.id) {
            include = true;
          }

          if (include) {
            pratiche.push(data);
            
            // Conta stati
            if (data.stato === 'completato' || data.stato === 'approvato') {
              completati++;
            } else if (data.stato === 'in_attesa' || data.stato === 'pending') {
              inAttesa++;
            }
          }
        });

        // Aggiorna contatori
        document.getElementById('stat-completati').textContent = completati;
        document.getElementById('stat-attesa').textContent = inAttesa;
        
        // Aggiorna lista (max 5 elementi)
        this.renderPratiche(pratiche.slice(0, 5));
      },
      (error) => {
        console.error('Errore caricamento pratiche:', error);
        document.getElementById('stat-completati').textContent = '0';
        document.getElementById('stat-attesa').textContent = '0';
        this.renderPratiche([]);
      }
    );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Carica comunicazioni non lette
   */
  loadComunicazioni(db) {
    const user = AuthManager.getCurrentUser();
    if (!user) return;

    let query = db.collection('comunicazioni')
      .where('letto', '==', false)
      .orderBy('dataCreazione', 'desc')
      .limit(5);

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        let comunicazioni = [];

        snapshot.forEach(doc => {
          const data = doc.data();
          data.id = doc.id;
          
          // Filtro per destinatario
          // Admin vede tutte, altri vedono solo quelle a loro destinate
          if (user.ruolo === 'admin' || 
              data.destinatarioId === user.id || 
              data.destinatarioId === 'tutti') {
            comunicazioni.push(data);
          }
        });

        // Aggiorna badge
        const badge = document.getElementById('badge-notifiche');
        if (comunicazioni.length > 0) {
          badge.textContent = comunicazioni.length;
          badge.style.display = 'inline-flex';
        } else {
          badge.style.display = 'none';
        }
        
        // Aggiorna lista
        this.renderComunicazioni(comunicazioni);
      },
      (error) => {
        console.error('Errore caricamento comunicazioni:', error);
        document.getElementById('badge-notifiche').style.display = 'none';
        this.renderComunicazioni([]);
      }
    );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Renderizza lista appuntamenti
   */
  renderAppuntamenti(appuntamenti) {
    const container = document.getElementById('lista-appuntamenti');
    if (!container) return;

    if (appuntamenti.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          <span>Nessun appuntamento oggi</span>
        </div>
      `;
      return;
    }

    container.innerHTML = appuntamenti.map(app => {
      const ora = app.data?.toDate ? 
        app.data.toDate().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) : 
        '--:--';
      
      return `
        <div class="lista-item" data-id="${app.id}" data-type="appuntamento">
          <div class="lista-item-ora">${ora}</div>
          <div class="lista-item-content">
            <div class="lista-item-title">${this.escapeHtml(app.titolo || 'Appuntamento')}</div>
            <div class="lista-item-subtitle">${this.escapeHtml(app.clienteNome || '')}</div>
          </div>
          <div class="lista-item-badge">
            <span class="badge badge-${this.getTipoBadgeClass(app.tipo)}">${app.tipo || 'Altro'}</span>
          </div>
        </div>
      `;
    }).join('');

    // Aggiungi click handlers
    container.querySelectorAll('.lista-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.openAppuntamento(id);
      });
    });
  },

  /**
   * Renderizza lista pratiche
   */
  renderPratiche(pratiche) {
    const container = document.getElementById('lista-pratiche');
    if (!container) return;

    if (pratiche.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <span>Nessuna pratica recente</span>
        </div>
      `;
      return;
    }

    container.innerHTML = pratiche.map(pratica => {
      const dataAgg = pratica.dataAggiornamento?.toDate ? 
        this.formatDataRelativa(pratica.dataAggiornamento.toDate()) : 
        '';
      
      return `
        <div class="lista-item lista-item-clickable" data-id="${pratica.id}" data-type="pratica">
          <div class="lista-item-content">
            <div class="lista-item-title">${this.escapeHtml(pratica.titolo || pratica.numero || 'Pratica')}</div>
            <div class="lista-item-subtitle">${this.escapeHtml(pratica.clienteNome || '')} • ${dataAgg}</div>
          </div>
          <div class="lista-item-badge">
            <span class="badge badge-${this.getStatoBadgeClass(pratica.stato)}">${this.formatStato(pratica.stato)}</span>
          </div>
        </div>
      `;
    }).join('');

    // Aggiungi click handlers
    container.querySelectorAll('.lista-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.openPratica(id);
      });
    });
  },

  /**
   * Renderizza lista comunicazioni
   */
  renderComunicazioni(comunicazioni) {
    const container = document.getElementById('lista-notifiche');
    if (!container) return;

    if (comunicazioni.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Nessuna comunicazione non letta</span>
        </div>
      `;
      return;
    }

    container.innerHTML = comunicazioni.map(com => {
      const dataCreazione = com.dataCreazione?.toDate ? 
        this.formatDataRelativa(com.dataCreazione.toDate()) : 
        '';
      
      return `
        <div class="lista-item lista-item-notifica" data-id="${com.id}" data-type="comunicazione">
          <div class="notifica-dot"></div>
          <div class="lista-item-content">
            <div class="lista-item-title">${this.escapeHtml(com.oggetto || 'Comunicazione')}</div>
            <div class="lista-item-subtitle">${dataCreazione}</div>
          </div>
        </div>
      `;
    }).join('');

    // Aggiungi click handlers
    container.querySelectorAll('.lista-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.openComunicazione(id);
      });
    });
  },

  /**
   * Apre dettaglio appuntamento
   */
  openAppuntamento(id) {
    console.log('Apri appuntamento:', id);
    // Naviga al modulo appuntamenti (quando sarà implementato)
    App.navigateTo('appuntamenti');
    App.showToast('Apertura appuntamento...', 'info');
  },

  /**
   * Apre dettaglio pratica
   */
  openPratica(id) {
    console.log('Apri pratica:', id);
    // Naviga al modulo clienti/pratiche (quando sarà implementato)
    App.navigateTo('clienti');
    App.showToast('Apertura pratica...', 'info');
  },

  /**
   * Apre comunicazione
   */
  openComunicazione(id) {
    console.log('Apri comunicazione:', id);
    // Naviga al modulo comunicazioni
    App.navigateTo('comunicazioni');
    App.showToast('Apertura comunicazione...', 'info');
  },

  /**
   * Formatta la data in formato relativo
   */
  formatDataRelativa(date) {
    const now = new Date();
    const diff = now - date;
    const minuti = Math.floor(diff / 60000);
    const ore = Math.floor(diff / 3600000);
    const giorni = Math.floor(diff / 86400000);

    if (minuti < 1) return 'Ora';
    if (minuti < 60) return `${minuti} min fa`;
    if (ore < 24) return `${ore} ore fa`;
    if (giorni < 7) return `${giorni} giorni fa`;
    
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short' 
    });
  },

  /**
   * Ritorna la classe badge per lo stato
   */
  getStatoBadgeClass(stato) {
    const mapping = {
      'nuovo': 'primary',
      'in_lavorazione': 'warning',
      'in_attesa': 'warning',
      'pending': 'warning',
      'completato': 'success',
      'approvato': 'success',
      'rifiutato': 'danger',
      'annullato': 'danger'
    };
    return mapping[stato] || 'secondary';
  },

  /**
   * Ritorna la classe badge per il tipo appuntamento
   */
  getTipoBadgeClass(tipo) {
    const mapping = {
      'chiamata': 'primary',
      'videocall': 'secondary',
      'incontro': 'success',
      'sopralluogo': 'warning'
    };
    return mapping[tipo] || 'primary';
  },

  /**
   * Formatta lo stato per visualizzazione
   */
  formatStato(stato) {
    const mapping = {
      'nuovo': 'Nuovo',
      'in_lavorazione': 'In Lavorazione',
      'in_attesa': 'In Attesa',
      'pending': 'Pending',
      'completato': 'Completato',
      'approvato': 'Approvato',
      'rifiutato': 'Rifiutato',
      'annullato': 'Annullato'
    };
    return mapping[stato] || stato || 'N/D';
  },

  /**
   * Escape HTML per prevenire XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * Mostra errore generico
   */
  showError() {
    document.getElementById('stat-clienti').textContent = '0';
    document.getElementById('stat-appuntamenti').textContent = '0';
    document.getElementById('stat-completati').textContent = '0';
    document.getElementById('stat-attesa').textContent = '0';
    
    const emptyMessage = `
      <div class="empty-state empty-state-error">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
        <span>Errore di connessione</span>
      </div>
    `;
    
    document.getElementById('lista-pratiche').innerHTML = emptyMessage;
    document.getElementById('lista-appuntamenti').innerHTML = emptyMessage;
    document.getElementById('lista-notifiche').innerHTML = emptyMessage;
  }
};

// Export globale
window.DashboardModule = DashboardModule;
