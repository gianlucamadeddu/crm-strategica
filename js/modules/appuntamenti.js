// CRM Strategica - Modulo Appuntamenti v1.0
// ==========================================
// Calendario appuntamenti con vista giorno/settimana

const AppuntamentiModule = {
  
  // Riferimenti
  container: null,
  unsubscribers: [],
  
  // Dati
  appuntamenti: [],
  clienti: [],
  consulenti: [],
  
  // Stato vista
  vista: 'settimana', // 'giorno' o 'settimana'
  dataCorrente: new Date(),
  appuntamentoCorrente: null,
  
  // Ore del calendario (8:00 - 20:00)
  oreCalendario: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],

  /**
   * Inizializza il modulo
   */
  async init() {
    console.log('📅 Appuntamenti - Inizializzazione...');
    
    this.container = document.getElementById('module-container');
    if (!this.container) return;
    
    // Resetta alla data odierna
    this.dataCorrente = new Date();
    
    // Carica dati necessari
    await this.loadClienti();
    await this.loadConsulenti();
    
    // Render e setup
    this.render();
    this.setupEventListeners();
    this.loadAppuntamenti();
    
    console.log('✅ Appuntamenti - Pronto!');
  },

  /**
   * Cleanup quando si esce dal modulo
   */
  cleanup() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.unsubscribers = [];
    this.appuntamentoCorrente = null;
    console.log('🧹 Appuntamenti - Cleanup completato');
  },

  /**
   * Carica clienti per il dropdown
   */
  async loadClienti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    try {
      let query = db.collection('clienti');

      // Filtra per ruolo
      if (user.ruolo === 'consulente') {
        query = query.where('consulenteId', '==', user.id);
      } else if (user.ruolo === 'team_manager') {
        query = query.where('teamManagerId', '==', user.id);
      }

      const snapshot = await query.get();
      this.clienti = [];
      snapshot.forEach(doc => {
        this.clienti.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
    }
  },

  /**
   * Carica consulenti
   */
  async loadConsulenti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    try {
      const snapshot = await db.collection('users').where('attivo', '==', true).get();
      this.consulenti = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        if (user.ruolo === 'admin') {
          this.consulenti.push({ id: doc.id, ...data });
        } else if (user.ruolo === 'team_manager') {
          if (data.teamManagerId === user.id || doc.id === user.id) {
            this.consulenti.push({ id: doc.id, ...data });
          }
        } else {
          // Consulente vede solo se stesso
          if (doc.id === user.id) {
            this.consulenti.push({ id: doc.id, ...data });
          }
        }
      });
    } catch (error) {
      console.error('Errore caricamento consulenti:', error);
    }
  },

  /**
   * Carica appuntamenti da Firebase (real-time)
   */
  loadAppuntamenti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    let query = db.collection('appuntamenti');

    // Filtra per ruolo
    if (user.ruolo === 'consulente') {
      query = query.where('consulenteId', '==', user.id);
    } else if (user.ruolo === 'team_manager') {
      query = query.where('teamManagerId', '==', user.id);
    }

    const unsubscribe = query.onSnapshot(
      (snapshot) => {
        this.appuntamenti = [];
        snapshot.forEach(doc => {
          this.appuntamenti.push({ id: doc.id, ...doc.data() });
        });
        this.renderCalendario();
      },
      (error) => {
        console.error('Errore caricamento appuntamenti:', error);
        App.showToast('Errore nel caricamento appuntamenti', 'error');
      }
    );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Renderizza HTML principale
   */
  render() {
    const user = AuthManager.getCurrentUser();
    const isAdmin = user?.ruolo === 'admin';
    const isTeamManager = user?.ruolo === 'team_manager';

    this.container.innerHTML = `
      <div class="appuntamenti-module">
        
        <!-- Header Calendario -->
        <div class="calendario-header">
          <div class="calendario-nav">
            <button id="btn-oggi" class="btn btn-secondary">Oggi</button>
            <button id="btn-prev" class="btn btn-secondary btn-icon-only">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button id="btn-next" class="btn btn-secondary btn-icon-only">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <h2 id="calendario-titolo" class="calendario-titolo"></h2>
          </div>
          
          <div class="calendario-actions">
            <!-- Filtro Consulente (solo Admin/TM) -->
            ${isAdmin || isTeamManager ? `
              <select id="filtro-consulente" class="filtro-select">
                <option value="">Tutti</option>
                ${this.consulenti.map(c => `
                  <option value="${c.id}">${c.nome} ${c.cognome}</option>
                `).join('')}
              </select>
            ` : ''}
            
            <!-- Toggle Vista -->
            <div class="vista-toggle">
              <button id="btn-vista-giorno" class="vista-btn ${this.vista === 'giorno' ? 'active' : ''}" data-vista="giorno">
                Giorno
              </button>
              <button id="btn-vista-settimana" class="vista-btn ${this.vista === 'settimana' ? 'active' : ''}" data-vista="settimana">
                Settimana
              </button>
            </div>
            
            <!-- Nuovo Appuntamento -->
            <button id="btn-nuovo-appuntamento" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuovo
            </button>
          </div>
        </div>
        
        <!-- Calendario Container -->
        <div class="calendario-container">
          <div id="calendario-content" class="calendario-content">
            <!-- Il calendario viene renderizzato qui -->
          </div>
        </div>
        
      </div>
      
      <!-- MODALS -->
      ${this.renderModalAppuntamento()}
      ${this.renderModalDettaglio()}
      ${this.renderModalElimina()}
    `;

    // Aggiorna titolo
    this.updateTitolo();
  },

  /**
   * Modal Nuovo/Modifica Appuntamento
   */
  renderModalAppuntamento() {
    const user = AuthManager.getCurrentUser();
    const isAdmin = user?.ruolo === 'admin';
    const isTeamManager = user?.ruolo === 'team_manager';

    return `
      <div id="modal-appuntamento" class="modal-overlay" style="display: none;">
        <div class="modal-container">
          <div class="modal-header">
            <h2 id="modal-app-title">Nuovo Appuntamento</h2>
            <button class="modal-close" data-close-modal="modal-appuntamento">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form id="form-appuntamento" class="modal-body">
            <input type="hidden" id="app-id">
            
            <div class="form-group">
              <label class="form-label">Titolo *</label>
              <input type="text" id="app-titolo" class="form-input" required placeholder="Es: Consulenza iniziale">
            </div>
            
            <div class="form-group">
              <label class="form-label">Cliente *</label>
              <select id="app-cliente" class="form-input" required>
                <option value="">-- Seleziona cliente --</option>
                ${this.clienti.map(c => `
                  <option value="${c.id}" data-nome="${c.nome} ${c.cognome}">${c.nome} ${c.cognome}${c.azienda ? ` - ${c.azienda}` : ''}</option>
                `).join('')}
              </select>
              <small class="form-hint">Puoi anche creare appuntamenti dalla scheda cliente</small>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Data *</label>
                <input type="date" id="app-data" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Ora *</label>
                <input type="time" id="app-ora" class="form-input" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Durata</label>
                <select id="app-durata" class="form-input">
                  <option value="30">30 minuti</option>
                  <option value="60" selected>1 ora</option>
                  <option value="90">1 ora e 30 min</option>
                  <option value="120">2 ore</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select id="app-tipo" class="form-input">
                  <option value="chiamata">📞 Chiamata</option>
                  <option value="videocall">💻 Videocall</option>
                  <option value="incontro">🤝 Incontro</option>
                  <option value="sopralluogo">🏠 Sopralluogo</option>
                </select>
              </div>
            </div>
            
            ${isAdmin || isTeamManager ? `
              <div class="form-group">
                <label class="form-label">Assegna a</label>
                <select id="app-consulente" class="form-input">
                  ${this.consulenti.map(c => `
                    <option value="${c.id}" ${c.id === user.id ? 'selected' : ''}>${c.nome} ${c.cognome}</option>
                  `).join('')}
                </select>
              </div>
            ` : ''}
            
            <div class="form-group">
              <label class="form-label">Note</label>
              <textarea id="app-note" class="form-input form-textarea" rows="3" placeholder="Dettagli aggiuntivi..."></textarea>
            </div>
          </form>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-appuntamento">Annulla</button>
            <button type="submit" form="form-appuntamento" class="btn btn-primary">Salva</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Dettaglio Appuntamento
   */
  renderModalDettaglio() {
    return `
      <div id="modal-dettaglio-app" class="modal-overlay" style="display: none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2 id="dettaglio-app-title">Dettaglio Appuntamento</h2>
            <button class="modal-close" data-close-modal="modal-dettaglio-app">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="modal-body" id="dettaglio-app-body">
            <!-- Contenuto dinamico -->
          </div>
          
          <div class="modal-footer">
            <button type="button" id="btn-elimina-app" class="btn btn-danger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Elimina
            </button>
            <button type="button" id="btn-vai-cliente" class="btn btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
              </svg>
              Vai al Cliente
            </button>
            <button type="button" id="btn-modifica-app" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
              Modifica
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Conferma Eliminazione
   */
  renderModalElimina() {
    return `
      <div id="modal-elimina-app" class="modal-overlay" style="display: none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2>Conferma Eliminazione</h2>
            <button class="modal-close" data-close-modal="modal-elimina-app">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body text-center">
            <div class="confirm-icon danger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p>Sei sicuro di voler eliminare questo appuntamento?</p>
            <p class="text-muted">Questa azione non può essere annullata.</p>
            <input type="hidden" id="elimina-app-id">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-elimina-app">Annulla</button>
            <button type="button" id="btn-conferma-elimina-app" class="btn btn-danger">Elimina</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Setup Event Listeners
   */
  setupEventListeners() {
    // Navigazione
    document.getElementById('btn-oggi')?.addEventListener('click', () => {
      this.dataCorrente = new Date();
      this.updateTitolo();
      this.renderCalendario();
    });

    document.getElementById('btn-prev')?.addEventListener('click', () => {
      if (this.vista === 'giorno') {
        this.dataCorrente.setDate(this.dataCorrente.getDate() - 1);
      } else {
        this.dataCorrente.setDate(this.dataCorrente.getDate() - 7);
      }
      this.updateTitolo();
      this.renderCalendario();
    });

    document.getElementById('btn-next')?.addEventListener('click', () => {
      if (this.vista === 'giorno') {
        this.dataCorrente.setDate(this.dataCorrente.getDate() + 1);
      } else {
        this.dataCorrente.setDate(this.dataCorrente.getDate() + 7);
      }
      this.updateTitolo();
      this.renderCalendario();
    });

    // Toggle Vista
    document.querySelectorAll('.vista-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.vista = e.currentTarget.dataset.vista;
        document.querySelectorAll('.vista-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.updateTitolo();
        this.renderCalendario();
      });
    });

    // Filtro Consulente
    document.getElementById('filtro-consulente')?.addEventListener('change', () => {
      this.renderCalendario();
    });

    // Nuovo Appuntamento
    document.getElementById('btn-nuovo-appuntamento')?.addEventListener('click', () => {
      this.openModalNuovo();
    });

    // Form submit
    document.getElementById('form-appuntamento')?.addEventListener('submit', (e) => {
      this.handleSaveAppuntamento(e);
    });

    // Chiudi modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.closeModal;
        this.closeModal(modalId);
      });
    });

    // Click overlay per chiudere
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });

    // Modifica da dettaglio
    document.getElementById('btn-modifica-app')?.addEventListener('click', () => {
      if (this.appuntamentoCorrente) {
        this.closeModal('modal-dettaglio-app');
        this.openModalModifica(this.appuntamentoCorrente.id);
      }
    });

    // Vai al Cliente da dettaglio
    document.getElementById('btn-vai-cliente')?.addEventListener('click', () => {
      if (this.appuntamentoCorrente && this.appuntamentoCorrente.clienteId) {
        this.navigaAlCliente(this.appuntamentoCorrente.clienteId);
      } else {
        App.showToast('Nessun cliente associato a questo appuntamento', 'warning');
      }
    });

    // Elimina da dettaglio
    document.getElementById('btn-elimina-app')?.addEventListener('click', () => {
      if (this.appuntamentoCorrente) {
        this.closeModal('modal-dettaglio-app');
        this.openModalElimina(this.appuntamentoCorrente.id);
      }
    });

    // Conferma eliminazione
    document.getElementById('btn-conferma-elimina-app')?.addEventListener('click', () => {
      this.handleEliminaAppuntamento();
    });
  },

  /**
   * Aggiorna titolo del calendario
   */
  updateTitolo() {
    const titoloEl = document.getElementById('calendario-titolo');
    if (!titoloEl) return;

    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const giorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    if (this.vista === 'giorno') {
      const giorno = giorniSettimana[this.dataCorrente.getDay()];
      const data = this.dataCorrente.getDate();
      const mese = mesi[this.dataCorrente.getMonth()];
      const anno = this.dataCorrente.getFullYear();
      titoloEl.textContent = `${giorno} ${data} ${mese} ${anno}`;
    } else {
      // Settimana
      const inizioSettimana = this.getInizioSettimana(this.dataCorrente);
      const fineSettimana = new Date(inizioSettimana);
      fineSettimana.setDate(fineSettimana.getDate() + 6);
      
      if (inizioSettimana.getMonth() === fineSettimana.getMonth()) {
        titoloEl.textContent = `${inizioSettimana.getDate()} - ${fineSettimana.getDate()} ${mesi[inizioSettimana.getMonth()]} ${inizioSettimana.getFullYear()}`;
      } else {
        titoloEl.textContent = `${inizioSettimana.getDate()} ${mesi[inizioSettimana.getMonth()]} - ${fineSettimana.getDate()} ${mesi[fineSettimana.getMonth()]} ${fineSettimana.getFullYear()}`;
      }
    }
  },

  /**
   * Ottiene il lunedì della settimana
   */
  getInizioSettimana(data) {
    const d = new Date(data);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Lunedì
    return new Date(d.setDate(diff));
  },

  /**
   * Renderizza il calendario
   */
  renderCalendario() {
    const container = document.getElementById('calendario-content');
    if (!container) return;

    // Filtra appuntamenti per consulente selezionato
    let appFiltrati = [...this.appuntamenti];
    const filtroConsulente = document.getElementById('filtro-consulente')?.value;
    if (filtroConsulente) {
      appFiltrati = appFiltrati.filter(a => a.consulenteId === filtroConsulente);
    }

    if (this.vista === 'giorno') {
      container.innerHTML = this.renderVistaGiorno(appFiltrati);
    } else {
      container.innerHTML = this.renderVistaSettimana(appFiltrati);
    }

    // Aggiungi event listeners agli appuntamenti
    container.querySelectorAll('.calendario-evento').forEach(evento => {
      evento.addEventListener('click', (e) => {
        const appId = e.currentTarget.dataset.id;
        this.openModalDettaglio(appId);
      });
    });

    // Click su slot vuoto per creare appuntamento
    container.querySelectorAll('.calendario-slot').forEach(slot => {
      slot.addEventListener('click', (e) => {
        if (e.target.classList.contains('calendario-slot')) {
          const data = slot.dataset.data;
          const ora = slot.dataset.ora;
          this.openModalNuovo(data, ora);
        }
      });
    });
  },

  /**
   * Renderizza vista giorno
   */
  renderVistaGiorno(appuntamenti) {
    const dataStr = this.formatDateForInput(this.dataCorrente);
    const oggi = this.formatDateForInput(new Date());
    const isOggi = dataStr === oggi;

    // Filtra appuntamenti del giorno
    const appDelGiorno = appuntamenti.filter(app => {
      const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
      return this.formatDateForInput(appData) === dataStr;
    });

    let html = `
      <div class="calendario-giorno">
        <div class="calendario-giorno-header ${isOggi ? 'oggi' : ''}">
          <span class="giorno-nome">${this.getNomeGiorno(this.dataCorrente)}</span>
          <span class="giorno-numero">${this.dataCorrente.getDate()}</span>
        </div>
        <div class="calendario-ore">
    `;

    this.oreCalendario.forEach(ora => {
      const appOra = appDelGiorno.filter(app => {
        const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
        return appData.getHours() === ora;
      });

      html += `
        <div class="calendario-riga-ora">
          <div class="calendario-label-ora">${ora.toString().padStart(2, '0')}:00</div>
          <div class="calendario-slot" data-data="${dataStr}" data-ora="${ora}">
            ${appOra.map(app => this.renderEvento(app)).join('')}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  },

  /**
   * Renderizza vista settimana
   */
  renderVistaSettimana(appuntamenti) {
    const inizioSettimana = this.getInizioSettimana(this.dataCorrente);
    const oggi = this.formatDateForInput(new Date());
    
    // Genera array di 7 giorni
    const giorni = [];
    for (let i = 0; i < 7; i++) {
      const data = new Date(inizioSettimana);
      data.setDate(data.getDate() + i);
      giorni.push(data);
    }

    let html = `
      <div class="calendario-settimana">
        <div class="calendario-header-settimana">
          <div class="calendario-angolo"></div>
          ${giorni.map(giorno => {
            const dataStr = this.formatDateForInput(giorno);
            const isOggi = dataStr === oggi;
            return `
              <div class="calendario-giorno-header ${isOggi ? 'oggi' : ''}">
                <span class="giorno-nome">${this.getNomeGiornoBreve(giorno)}</span>
                <span class="giorno-numero">${giorno.getDate()}</span>
              </div>
            `;
          }).join('')}
        </div>
        <div class="calendario-body-settimana">
    `;

    this.oreCalendario.forEach(ora => {
      html += `
        <div class="calendario-riga-settimana">
          <div class="calendario-label-ora">${ora.toString().padStart(2, '0')}:00</div>
          ${giorni.map(giorno => {
            const dataStr = this.formatDateForInput(giorno);
            
            // Trova appuntamenti per questo slot
            const appSlot = appuntamenti.filter(app => {
              const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
              return this.formatDateForInput(appData) === dataStr && appData.getHours() === ora;
            });

            return `
              <div class="calendario-slot" data-data="${dataStr}" data-ora="${ora}">
                ${appSlot.map(app => this.renderEvento(app, true)).join('')}
              </div>
            `;
          }).join('')}
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    return html;
  },

  /**
   * Renderizza singolo evento
   */
  renderEvento(app, compact = false) {
    const tipoIcne = {
      'chiamata': '📞',
      'videocall': '💻',
      'incontro': '🤝',
      'sopralluogo': '🏠'
    };

    const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
    const oraStr = `${appData.getHours().toString().padStart(2, '0')}:${appData.getMinutes().toString().padStart(2, '0')}`;
    const durata = app.durata || 60;
    const altezza = Math.max(durata / 60, 0.5); // Minimo 0.5 per eventi brevi

    return `
      <div class="calendario-evento ${compact ? 'compact' : ''}" 
           data-id="${app.id}" 
           data-tipo="${app.tipo || 'incontro'}"
           style="--durata: ${altezza}">
        <div class="evento-ora">${tipoIcne[app.tipo] || '📅'} ${oraStr}</div>
        <div class="evento-titolo">${this.escapeHtml(app.titolo || 'Appuntamento')}</div>
        ${!compact ? `<div class="evento-cliente">${this.escapeHtml(app.clienteNome || '')}</div>` : ''}
      </div>
    `;
  },

  /**
   * Open Modal Nuovo Appuntamento
   */
  openModalNuovo(data = null, ora = null) {
    const form = document.getElementById('form-appuntamento');
    form.reset();
    document.getElementById('app-id').value = '';
    document.getElementById('modal-app-title').textContent = 'Nuovo Appuntamento';
    
    // Pre-compila data e ora se passate
    if (data) {
      document.getElementById('app-data').value = data;
    } else {
      document.getElementById('app-data').value = this.formatDateForInput(this.dataCorrente);
    }
    
    if (ora) {
      document.getElementById('app-ora').value = `${ora.toString().padStart(2, '0')}:00`;
    } else {
      document.getElementById('app-ora').value = '09:00';
    }

    document.getElementById('modal-appuntamento').style.display = 'flex';
  },

  /**
   * Open Modal Modifica
   */
  openModalModifica(appId) {
    const app = this.appuntamenti.find(a => a.id === appId);
    if (!app) return;

    document.getElementById('modal-app-title').textContent = 'Modifica Appuntamento';
    document.getElementById('app-id').value = app.id;
    document.getElementById('app-titolo').value = app.titolo || '';
    document.getElementById('app-cliente').value = app.clienteId || '';
    document.getElementById('app-tipo').value = app.tipo || 'incontro';
    document.getElementById('app-durata').value = app.durata || 60;
    document.getElementById('app-note').value = app.note || '';

    // Data e ora
    const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
    document.getElementById('app-data').value = this.formatDateForInput(appData);
    document.getElementById('app-ora').value = `${appData.getHours().toString().padStart(2, '0')}:${appData.getMinutes().toString().padStart(2, '0')}`;

    // Consulente
    const selCons = document.getElementById('app-consulente');
    if (selCons) {
      selCons.value = app.consulenteId || '';
    }

    document.getElementById('modal-appuntamento').style.display = 'flex';
  },

  /**
   * Open Modal Dettaglio
   */
  openModalDettaglio(appId) {
    const app = this.appuntamenti.find(a => a.id === appId);
    if (!app) return;

    this.appuntamentoCorrente = app;

    document.getElementById('dettaglio-app-title').textContent = app.titolo || 'Appuntamento';
    
    const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
    const dataStr = appData.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const oraStr = `${appData.getHours().toString().padStart(2, '0')}:${appData.getMinutes().toString().padStart(2, '0')}`;

    const tipoLabel = {
      'chiamata': '📞 Chiamata',
      'videocall': '💻 Videocall',
      'incontro': '🤝 Incontro',
      'sopralluogo': '🏠 Sopralluogo'
    };

    const consulente = this.consulenti.find(c => c.id === app.consulenteId);

    const body = document.getElementById('dettaglio-app-body');
    body.innerHTML = `
      <div class="dettaglio-app-info">
        <div class="info-field">
          <span class="info-label">Cliente</span>
          <span class="info-value">${this.escapeHtml(app.clienteNome || '-')}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Data e Ora</span>
          <span class="info-value">${dataStr} alle ${oraStr}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Tipo</span>
          <span class="info-value">${tipoLabel[app.tipo] || app.tipo}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Durata</span>
          <span class="info-value">${app.durata || 60} minuti</span>
        </div>
        <div class="info-field">
          <span class="info-label">Commerciale</span>
          <span class="info-value">${consulente ? `${consulente.nome} ${consulente.cognome}` : '-'}</span>
        </div>
        ${app.note ? `
          <div class="info-field">
            <span class="info-label">Note</span>
            <span class="info-value">${this.escapeHtml(app.note)}</span>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('modal-dettaglio-app').style.display = 'flex';
  },

  /**
   * Open Modal Elimina
   */
  openModalElimina(appId) {
    document.getElementById('elimina-app-id').value = appId;
    document.getElementById('modal-elimina-app').style.display = 'flex';
  },

  /**
   * Salva Appuntamento
   */
  async handleSaveAppuntamento(e) {
    e.preventDefault();

    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Database non disponibile', 'error');
      return;
    }

    const user = AuthManager.getCurrentUser();
    const appId = document.getElementById('app-id').value;
    const isEdit = !!appId;

    // Costruisci data/ora
    const dataStr = document.getElementById('app-data').value;
    const oraStr = document.getElementById('app-ora').value;
    const dataOra = new Date(`${dataStr}T${oraStr}`);

    // Ottieni nome cliente
    const clienteSelect = document.getElementById('app-cliente');
    const clienteId = clienteSelect.value;
    const clienteNome = clienteSelect.options[clienteSelect.selectedIndex]?.dataset?.nome || '';

    // Determina consulenteId e teamManagerId
    let consulenteId = user.id;
    let teamManagerId = user.teamManagerId || null;
    
    const selCons = document.getElementById('app-consulente');
    if (selCons && selCons.value) {
      consulenteId = selCons.value;
      const consulente = this.consulenti.find(c => c.id === selCons.value);
      teamManagerId = consulente?.teamManagerId || null;
    }

    const appData = {
      titolo: document.getElementById('app-titolo').value.trim(),
      clienteId: clienteId,
      clienteNome: clienteNome,
      data: firebase.firestore.Timestamp.fromDate(dataOra),
      tipo: document.getElementById('app-tipo').value,
      durata: parseInt(document.getElementById('app-durata').value) || 60,
      note: document.getElementById('app-note').value.trim(),
      consulenteId: consulenteId,
      teamManagerId: teamManagerId,
      dataModifica: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (isEdit) {
        await db.collection('appuntamenti').doc(appId).update(appData);
        App.showToast('Appuntamento aggiornato', 'success');
      } else {
        appData.dataCreazione = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('appuntamenti').add(appData);
        App.showToast('Appuntamento creato', 'success');
      }

      this.closeModal('modal-appuntamento');

    } catch (error) {
      console.error('Errore salvataggio appuntamento:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  /**
   * Elimina Appuntamento
   */
  async handleEliminaAppuntamento() {
    const appId = document.getElementById('elimina-app-id').value;
    if (!appId) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('appuntamenti').doc(appId).delete();
      App.showToast('Appuntamento eliminato', 'success');
      this.closeModal('modal-elimina-app');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      App.showToast('Errore durante l\'eliminazione', 'error');
    }
  },

  /**
   * Chiudi Modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },

  /**
   * Naviga alla scheda del cliente
   */
  navigaAlCliente(clienteId) {
    if (!clienteId) {
      App.showToast('Nessun cliente associato', 'warning');
      return;
    }

    // Chiudi il modal dettaglio
    this.closeModal('modal-dettaglio-app');

    // Naviga al modulo Clienti
    App.navigateTo('clienti');

    // Aspetta che il modulo sia caricato, poi apri il dettaglio cliente
    setTimeout(() => {
      if (window.ClientiModule && typeof ClientiModule.openModalDettaglio === 'function') {
        ClientiModule.openModalDettaglio(clienteId);
      } else {
        App.showToast('Impossibile aprire la scheda cliente', 'error');
      }
    }, 500);
  },

  /**
   * Formatta data per input type="date"
   */
  formatDateForInput(date) {
    const d = new Date(date);
    const anno = d.getFullYear();
    const mese = (d.getMonth() + 1).toString().padStart(2, '0');
    const giorno = d.getDate().toString().padStart(2, '0');
    return `${anno}-${mese}-${giorno}`;
  },

  /**
   * Nome giorno completo
   */
  getNomeGiorno(data) {
    const giorni = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    return giorni[data.getDay()];
  },

  /**
   * Nome giorno breve
   */
  getNomeGiornoBreve(data) {
    const giorni = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
    return giorni[data.getDay()];
  },

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export globale
window.AppuntamentiModule = AppuntamentiModule;
