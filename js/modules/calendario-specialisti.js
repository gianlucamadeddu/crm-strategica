// CRM Strategica - Modulo Calendario Specialisti v1.0
// ====================================================
// Gestione disponibilità soci specialisti e prenotazione appuntamenti

const CalendarioSpecialistiModule = {

  // Riferimenti
  container: null,
  unsubscribers: [],

  // Dati
  specialisti: [],
  disponibilita: [],
  appuntamenti: [],
  clienti: [],

  // Stato vista
  dataCorrente: new Date(),
  vista: 'settimana', // 'settimana' o 'giorno'

  // Ore del calendario (8:00 - 20:00)
  oreCalendario: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20],

  // Mezza ora slots
  slotMinuti: [0, 30],

  /**
   * Inizializza il modulo
   */
  async init() {
    console.log('📅 Calendario Specialisti - Inizializzazione...');

    this.container = document.getElementById('module-container');
    if (!this.container) return;

    this.dataCorrente = new Date();

    // Carica dati
    await this.loadSpecialisti();
    await this.loadClienti();

    // Render
    this.render();
    this.setupEventListeners();

    // Real-time listeners
    this.loadDisponibilita();
    this.loadAppuntamenti();

    console.log('✅ Calendario Specialisti - Pronto!');
  },

  /**
   * Cleanup
   */
  cleanup() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.unsubscribers = [];
    console.log('🧹 Calendario Specialisti - Cleanup completato');
  },

  // =========================================
  // DATA LOADING
  // =========================================

  /**
   * Carica lista specialisti
   */
  async loadSpecialisti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      const snapshot = await db.collection('specialisti').where('attivo', '==', true).orderBy('nome').get();
      this.specialisti = [];
      snapshot.forEach(doc => {
        this.specialisti.push({ id: doc.id, ...doc.data() });
      });
    } catch (error) {
      console.error('Errore caricamento specialisti:', error);
    }
  },

  /**
   * Carica clienti per dropdown prenotazione
   */
  async loadClienti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    try {
      let query = db.collection('clienti');

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
   * Carica disponibilità in real-time
   */
  loadDisponibilita() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const unsubscribe = db.collection('disponibilita_specialisti')
      .onSnapshot(
        (snapshot) => {
          this.disponibilita = [];
          snapshot.forEach(doc => {
            this.disponibilita.push({ id: doc.id, ...doc.data() });
          });
          this.renderCalendario();
        },
        (error) => {
          console.error('Errore caricamento disponibilità:', error);
        }
      );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Carica appuntamenti specialisti in real-time
   */
  loadAppuntamenti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const unsubscribe = db.collection('appuntamenti_specialisti')
      .onSnapshot(
        (snapshot) => {
          this.appuntamenti = [];
          snapshot.forEach(doc => {
            this.appuntamenti.push({ id: doc.id, ...doc.data() });
          });
          this.renderCalendario();
        },
        (error) => {
          console.error('Errore caricamento appuntamenti specialisti:', error);
        }
      );

    this.unsubscribers.push(unsubscribe);
  },

  // =========================================
  // RENDER PRINCIPALE
  // =========================================

  render() {
    this.container.innerHTML = `
      <div class="cal-spec-module">

        <!-- HEADER -->
        <div class="cal-spec-header">
          <div class="cal-spec-nav">
            <button id="cs-btn-oggi" class="btn btn-secondary">Oggi</button>
            <button id="cs-btn-prev" class="btn btn-secondary btn-icon-only">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button id="cs-btn-next" class="btn btn-secondary btn-icon-only">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
            <h2 id="cs-titolo" class="calendario-titolo"></h2>
          </div>

          <div class="cal-spec-actions">
            <!-- Vista Toggle -->
            <div class="vista-toggle">
              <button class="vista-btn ${this.vista === 'giorno' ? 'active' : ''}" data-vista="giorno">Giorno</button>
              <button class="vista-btn ${this.vista === 'settimana' ? 'active' : ''}" data-vista="settimana">Settimana</button>
            </div>

            <!-- Gestisci Disponibilità -->
            <button id="cs-btn-disponibilita" class="btn btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Disponibilità
            </button>

            <!-- Gestisci Specialisti -->
            <button id="cs-btn-gestisci-spec" class="btn btn-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
              Specialisti
            </button>
          </div>
        </div>

        <!-- LEGENDA -->
        <div class="cal-spec-legenda">
          <span class="legenda-item"><span class="legenda-dot disponibile"></span> Disponibile</span>
          <span class="legenda-item"><span class="legenda-dot occupato"></span> Prenotato</span>
          <span class="legenda-item"><span class="legenda-dot non-disponibile"></span> Non disponibile</span>
          <span class="legenda-item"><span class="legenda-dot vuoto"></span> Nessuna info</span>
        </div>

        <!-- CALENDARIO -->
        <div class="cal-spec-container">
          <div id="cs-calendario" class="cal-spec-content">
            <!-- Calendario renderizzato qui -->
          </div>
        </div>

      </div>

      <!-- MODALS -->
      ${this.renderModalGestisciSpecialisti()}
      ${this.renderModalNuovoSpecialista()}
      ${this.renderModalDisponibilita()}
      ${this.renderModalPrenotazione()}
      ${this.renderModalDettaglioPrenotazione()}
      ${this.renderModalEliminaPrenotazione()}
    `;

    this.updateTitolo();
  },

  // =========================================
  // MODALS HTML
  // =========================================

  /**
   * Modal Gestisci Specialisti
   */
  renderModalGestisciSpecialisti() {
    return `
      <div id="modal-gestisci-spec" class="modal-overlay" style="display:none;">
        <div class="modal-container">
          <div class="modal-header">
            <h2>Gestisci Specialisti</h2>
            <button class="modal-close" data-close-modal="modal-gestisci-spec">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div id="lista-specialisti" class="lista-specialisti">
              <!-- Generato dinamicamente -->
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-gestisci-spec">Chiudi</button>
            <button type="button" id="cs-btn-nuovo-spec" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuovo Specialista
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Nuovo/Modifica Specialista
   */
  renderModalNuovoSpecialista() {
    const colori = [
      { value: '#4F46E5', label: 'Indaco' },
      { value: '#059669', label: 'Verde' },
      { value: '#D97706', label: 'Ambra' },
      { value: '#DC2626', label: 'Rosso' },
      { value: '#7C3AED', label: 'Viola' },
      { value: '#0891B2', label: 'Ciano' },
      { value: '#DB2777', label: 'Rosa' },
      { value: '#65A30D', label: 'Lime' },
    ];

    return `
      <div id="modal-nuovo-spec" class="modal-overlay" style="display:none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2 id="modal-spec-title">Nuovo Specialista</h2>
            <button class="modal-close" data-close-modal="modal-nuovo-spec">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form id="form-nuovo-spec" class="modal-body">
            <input type="hidden" id="spec-id">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" id="spec-nome" class="form-input" required placeholder="Nome">
              </div>
              <div class="form-group">
                <label class="form-label">Cognome *</label>
                <input type="text" id="spec-cognome" class="form-input" required placeholder="Cognome">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Colore calendario</label>
                <select id="spec-colore" class="form-input">
                  ${colori.map(c => `<option value="${c.value}" style="color:${c.value}">${c.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Durata slot default (min)</label>
                <select id="spec-durata-default" class="form-input">
                  <option value="30">30 minuti</option>
                  <option value="60" selected>1 ora</option>
                  <option value="90">1 ora e 30</option>
                  <option value="120">2 ore</option>
                </select>
              </div>
            </div>
          </form>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-nuovo-spec">Annulla</button>
            <button type="submit" form="form-nuovo-spec" class="btn btn-primary">Salva</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Gestisci Disponibilità
   */
  renderModalDisponibilita() {
    return `
      <div id="modal-disponibilita" class="modal-overlay" style="display:none;">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <h2>Gestisci Disponibilità</h2>
            <button class="modal-close" data-close-modal="modal-disponibilita">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <!-- Seleziona Specialista -->
            <div class="form-group">
              <label class="form-label">Specialista</label>
              <select id="disp-specialista" class="form-input">
                <option value="">-- Seleziona specialista --</option>
                ${this.specialisti.map(s => `<option value="${s.id}">${s.nome} ${s.cognome}</option>`).join('')}
              </select>
            </div>

            <!-- Modalità -->
            <div class="form-group">
              <label class="form-label">Modalità di inserimento</label>
              <div class="vista-toggle" style="margin-top:6px">
                <button class="vista-btn active" data-mode="disponibile" id="disp-mode-disponibile">Inserisci Disponibilità</button>
                <button class="vista-btn" data-mode="non_disponibile" id="disp-mode-non-disponibile">Blocca Indisponibilità</button>
              </div>
            </div>

            <!-- Tipo: ricorrente o data specifica -->
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <div class="vista-toggle" style="margin-top:6px">
                <button class="vista-btn active" data-tipo="ricorrente" id="disp-tipo-ricorrente">Settimanale Ricorrente</button>
                <button class="vista-btn" data-tipo="specifica" id="disp-tipo-specifica">Data Specifica</button>
              </div>
            </div>

            <!-- Sezione Ricorrente -->
            <div id="disp-sezione-ricorrente">
              <div class="form-group">
                <label class="form-label">Giorni della settimana</label>
                <div class="giorni-settimana-selector">
                  <label class="giorno-check"><input type="checkbox" value="1"> Lun</label>
                  <label class="giorno-check"><input type="checkbox" value="2"> Mar</label>
                  <label class="giorno-check"><input type="checkbox" value="3"> Mer</label>
                  <label class="giorno-check"><input type="checkbox" value="4"> Gio</label>
                  <label class="giorno-check"><input type="checkbox" value="5"> Ven</label>
                  <label class="giorno-check"><input type="checkbox" value="6"> Sab</label>
                  <label class="giorno-check"><input type="checkbox" value="0"> Dom</label>
                </div>
              </div>
            </div>

            <!-- Sezione Data Specifica -->
            <div id="disp-sezione-specifica" style="display:none">
              <div class="form-group">
                <label class="form-label">Data</label>
                <input type="date" id="disp-data" class="form-input">
              </div>
            </div>

            <!-- Orari -->
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Ora Inizio</label>
                <input type="time" id="disp-ora-inizio" class="form-input" value="09:00">
              </div>
              <div class="form-group">
                <label class="form-label">Ora Fine</label>
                <input type="time" id="disp-ora-fine" class="form-input" value="18:00">
              </div>
            </div>

            <button type="button" id="cs-btn-salva-disp" class="btn btn-primary" style="width:100%;margin-top:12px">
              Salva Disponibilità
            </button>

            <!-- Lista disponibilità esistenti -->
            <div style="margin-top:24px">
              <h3 style="font-size:14px;font-weight:600;margin-bottom:12px">Disponibilità salvate</h3>
              <div id="lista-disponibilita" class="lista-disponibilita">
                <p class="text-muted">Seleziona uno specialista per vedere le disponibilità.</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-disponibilita">Chiudi</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Prenotazione
   */
  renderModalPrenotazione() {
    return `
      <div id="modal-prenotazione-spec" class="modal-overlay" style="display:none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2 id="modal-prenota-title">Prenota Appuntamento</h2>
            <button class="modal-close" data-close-modal="modal-prenotazione-spec">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form id="form-prenotazione-spec" class="modal-body">
            <input type="hidden" id="prenota-spec-id">
            <input type="hidden" id="prenota-data">
            <input type="hidden" id="prenota-ora">

            <div class="prenota-riepilogo" id="prenota-riepilogo">
              <!-- Riepilogo specialista, data, ora -->
            </div>

            <div class="form-group">
              <label class="form-label">Cliente *</label>
              <select id="prenota-cliente" class="form-input" required>
                <option value="">-- Seleziona cliente --</option>
                ${this.clienti.map(c => `
                  <option value="${c.id}" data-nome="${c.nome} ${c.cognome}">${c.nome} ${c.cognome}${c.azienda ? ` - ${c.azienda}` : ''}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Titolo appuntamento</label>
              <input type="text" id="prenota-titolo" class="form-input" placeholder="Es: Consulenza fiscale">
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Durata</label>
                <select id="prenota-durata" class="form-input">
                  <option value="30">30 minuti</option>
                  <option value="60">1 ora</option>
                  <option value="90">1 ora e 30</option>
                  <option value="120">2 ore</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Tipo</label>
                <select id="prenota-tipo" class="form-input">
                  <option value="incontro">🤝 Incontro</option>
                  <option value="videocall">💻 Videocall</option>
                  <option value="chiamata">📞 Chiamata</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Note</label>
              <textarea id="prenota-note" class="form-input form-textarea" rows="2" placeholder="Note aggiuntive..."></textarea>
            </div>
          </form>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-prenotazione-spec">Annulla</button>
            <button type="submit" form="form-prenotazione-spec" class="btn btn-primary">Prenota</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Dettaglio Prenotazione
   */
  renderModalDettaglioPrenotazione() {
    return `
      <div id="modal-dettaglio-prenota" class="modal-overlay" style="display:none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2 id="dettaglio-prenota-title">Dettaglio Prenotazione</h2>
            <button class="modal-close" data-close-modal="modal-dettaglio-prenota">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body" id="dettaglio-prenota-body">
            <!-- Contenuto dinamico -->
          </div>
          <div class="modal-footer">
            <button type="button" id="cs-btn-elimina-prenota" class="btn btn-danger">Elimina</button>
            <button type="button" class="btn btn-secondary" data-close-modal="modal-dettaglio-prenota">Chiudi</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Conferma Eliminazione
   */
  renderModalEliminaPrenotazione() {
    return `
      <div id="modal-elimina-prenota" class="modal-overlay" style="display:none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2>Conferma Eliminazione</h2>
            <button class="modal-close" data-close-modal="modal-elimina-prenota">
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
            <p>Sei sicuro di voler eliminare questa prenotazione?</p>
            <p class="text-muted">Questa azione non può essere annullata.</p>
            <input type="hidden" id="elimina-prenota-id">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-elimina-prenota">Annulla</button>
            <button type="button" id="cs-btn-conferma-elimina" class="btn btn-danger">Elimina</button>
          </div>
        </div>
      </div>
    `;
  },

  // =========================================
  // EVENT LISTENERS
  // =========================================

  setupEventListeners() {
    // Navigazione
    document.getElementById('cs-btn-oggi')?.addEventListener('click', () => {
      this.dataCorrente = new Date();
      this.updateTitolo();
      this.renderCalendario();
    });

    document.getElementById('cs-btn-prev')?.addEventListener('click', () => {
      if (this.vista === 'giorno') {
        this.dataCorrente.setDate(this.dataCorrente.getDate() - 1);
      } else {
        this.dataCorrente.setDate(this.dataCorrente.getDate() - 7);
      }
      this.updateTitolo();
      this.renderCalendario();
    });

    document.getElementById('cs-btn-next')?.addEventListener('click', () => {
      if (this.vista === 'giorno') {
        this.dataCorrente.setDate(this.dataCorrente.getDate() + 1);
      } else {
        this.dataCorrente.setDate(this.dataCorrente.getDate() + 7);
      }
      this.updateTitolo();
      this.renderCalendario();
    });

    // Vista toggle
    this.container.querySelectorAll('.cal-spec-header .vista-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.vista = e.currentTarget.dataset.vista;
        this.container.querySelectorAll('.cal-spec-header .vista-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.updateTitolo();
        this.renderCalendario();
      });
    });

    // Apri gestisci specialisti
    document.getElementById('cs-btn-gestisci-spec')?.addEventListener('click', () => {
      this.openModalGestisciSpecialisti();
    });

    // Nuovo specialista
    document.getElementById('cs-btn-nuovo-spec')?.addEventListener('click', () => {
      this.openModalNuovoSpecialista();
    });

    // Form nuovo specialista
    document.getElementById('form-nuovo-spec')?.addEventListener('submit', (e) => {
      this.handleSaveSpecialista(e);
    });

    // Apri disponibilità
    document.getElementById('cs-btn-disponibilita')?.addEventListener('click', () => {
      this.openModalDisponibilita();
    });

    // Disponibilità - cambio specialista
    document.getElementById('disp-specialista')?.addEventListener('change', () => {
      this.renderListaDisponibilita();
    });

    // Disponibilità - toggle modalità
    document.getElementById('disp-mode-disponibile')?.addEventListener('click', (e) => {
      e.currentTarget.classList.add('active');
      document.getElementById('disp-mode-non-disponibile')?.classList.remove('active');
    });
    document.getElementById('disp-mode-non-disponibile')?.addEventListener('click', (e) => {
      e.currentTarget.classList.add('active');
      document.getElementById('disp-mode-disponibile')?.classList.remove('active');
    });

    // Disponibilità - toggle tipo
    document.getElementById('disp-tipo-ricorrente')?.addEventListener('click', (e) => {
      e.currentTarget.classList.add('active');
      document.getElementById('disp-tipo-specifica')?.classList.remove('active');
      document.getElementById('disp-sezione-ricorrente').style.display = 'block';
      document.getElementById('disp-sezione-specifica').style.display = 'none';
    });
    document.getElementById('disp-tipo-specifica')?.addEventListener('click', (e) => {
      e.currentTarget.classList.add('active');
      document.getElementById('disp-tipo-ricorrente')?.classList.remove('active');
      document.getElementById('disp-sezione-ricorrente').style.display = 'none';
      document.getElementById('disp-sezione-specifica').style.display = 'block';
    });

    // Salva disponibilità
    document.getElementById('cs-btn-salva-disp')?.addEventListener('click', () => {
      this.handleSaveDisponibilita();
    });

    // Form prenotazione
    document.getElementById('form-prenotazione-spec')?.addEventListener('submit', (e) => {
      this.handleSavePrenotazione(e);
    });

    // Elimina prenotazione da dettaglio
    document.getElementById('cs-btn-elimina-prenota')?.addEventListener('click', () => {
      const appId = this._currentPrenotazioneId;
      if (appId) {
        this.closeModal('modal-dettaglio-prenota');
        document.getElementById('elimina-prenota-id').value = appId;
        document.getElementById('modal-elimina-prenota').style.display = 'flex';
      }
    });

    // Conferma eliminazione
    document.getElementById('cs-btn-conferma-elimina')?.addEventListener('click', () => {
      this.handleEliminaPrenotazione();
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
  },

  // =========================================
  // TITOLO E NAVIGAZIONE
  // =========================================

  updateTitolo() {
    const titoloEl = document.getElementById('cs-titolo');
    if (!titoloEl) return;

    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const giorniSettimana = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];

    if (this.vista === 'giorno') {
      const g = giorniSettimana[this.dataCorrente.getDay()];
      titoloEl.textContent = `${g} ${this.dataCorrente.getDate()} ${mesi[this.dataCorrente.getMonth()]} ${this.dataCorrente.getFullYear()}`;
    } else {
      const inizio = this.getInizioSettimana(this.dataCorrente);
      const fine = new Date(inizio);
      fine.setDate(fine.getDate() + 6);

      if (inizio.getMonth() === fine.getMonth()) {
        titoloEl.textContent = `${inizio.getDate()} - ${fine.getDate()} ${mesi[inizio.getMonth()]} ${inizio.getFullYear()}`;
      } else {
        titoloEl.textContent = `${inizio.getDate()} ${mesi[inizio.getMonth()]} - ${fine.getDate()} ${mesi[fine.getMonth()]} ${fine.getFullYear()}`;
      }
    }
  },

  getInizioSettimana(data) {
    const d = new Date(data);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  },

  // =========================================
  // CALENDARIO RENDER
  // =========================================

  renderCalendario() {
    const container = document.getElementById('cs-calendario');
    if (!container) return;

    if (this.specialisti.length === 0) {
      container.innerHTML = `
        <div class="module-placeholder">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px;height:48px;color:var(--text-muted)">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          <div class="module-placeholder-title">Nessuno specialista configurato</div>
          <div class="module-placeholder-text">Clicca su "Specialisti" per aggiungere i soci specialisti.</div>
        </div>
      `;
      return;
    }

    if (this.vista === 'giorno') {
      container.innerHTML = this.renderVistaGiorno();
    } else {
      container.innerHTML = this.renderVistaSettimana();
    }

    // Event listeners su slot e eventi
    this.bindCalendarioEvents(container);
  },

  /**
   * Vista GIORNO: righe = ore, colonne = specialisti
   */
  renderVistaGiorno() {
    const dataStr = this.formatDate(this.dataCorrente);
    const giornoSettimana = this.dataCorrente.getDay(); // 0=Dom, 1=Lun...

    let html = `
      <div class="cs-griglia cs-griglia-giorno">
        <!-- Header specialisti -->
        <div class="cs-griglia-header">
          <div class="cs-angolo">Ora</div>
          ${this.specialisti.map(spec => `
            <div class="cs-spec-header" style="border-top: 3px solid ${spec.colore || '#4F46E5'}">
              <div class="cs-spec-avatar" style="background:${spec.colore || '#4F46E5'}">${(spec.nome || '')[0]}${(spec.cognome || '')[0]}</div>
              <span class="cs-spec-nome">${this.escapeHtml(spec.nome)} ${this.escapeHtml(spec.cognome)}</span>
            </div>
          `).join('')}
        </div>
        <!-- Body -->
        <div class="cs-griglia-body">
    `;

    this.oreCalendario.forEach(ora => {
      for (const minuto of this.slotMinuti) {
        const oraStr = `${ora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;
        const showLabel = minuto === 0;

        html += `<div class="cs-riga ${minuto === 30 ? 'cs-riga-mezza' : ''}">`;
        html += `<div class="cs-label-ora">${showLabel ? oraStr : ''}</div>`;

        this.specialisti.forEach(spec => {
          const stato = this.getStatoSlot(spec.id, dataStr, giornoSettimana, ora, minuto);
          const appSlot = this.getAppuntamentoSlot(spec.id, dataStr, ora, minuto);

          if (appSlot) {
            html += `
              <div class="cs-slot cs-slot-occupato" data-app-id="${appSlot.id}" title="${this.escapeHtml(appSlot.titolo || appSlot.clienteNome || 'Prenotato')}">
                <div class="cs-slot-evento" style="border-left:3px solid ${spec.colore || '#4F46E5'}">
                  <span class="cs-evento-ora">${oraStr}</span>
                  <span class="cs-evento-titolo">${this.escapeHtml(appSlot.titolo || appSlot.clienteNome || 'Prenotato')}</span>
                </div>
              </div>
            `;
          } else if (stato === 'disponibile') {
            html += `
              <div class="cs-slot cs-slot-disponibile" data-spec-id="${spec.id}" data-data="${dataStr}" data-ora="${ora}" data-minuto="${minuto}">
                <span class="cs-slot-label">Disponibile</span>
              </div>
            `;
          } else if (stato === 'non_disponibile') {
            html += `<div class="cs-slot cs-slot-non-disponibile"><span class="cs-slot-label">—</span></div>`;
          } else {
            html += `<div class="cs-slot cs-slot-vuoto"></div>`;
          }
        });

        html += `</div>`;
      }
    });

    html += `</div></div>`;
    return html;
  },

  /**
   * Vista SETTIMANA: una sotto-griglia per giorno, colonne = specialisti
   * Per semplicità in settimana mostriamo solo slot interi (no mezz'ora) e una riga per ora
   */
  renderVistaSettimana() {
    const inizio = this.getInizioSettimana(this.dataCorrente);
    const oggi = this.formatDate(new Date());

    const giorni = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(inizio);
      d.setDate(d.getDate() + i);
      giorni.push(d);
    }

    const giorniNomi = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    let html = `<div class="cs-settimana-wrapper">`;

    giorni.forEach(giorno => {
      const dataStr = this.formatDate(giorno);
      const isOggi = dataStr === oggi;
      const giornoSett = giorno.getDay();

      html += `
        <div class="cs-giorno-blocco ${isOggi ? 'cs-oggi' : ''}">
          <div class="cs-giorno-titolo ${isOggi ? 'cs-oggi-title' : ''}">
            ${giorniNomi[giornoSett]} ${giorno.getDate()}
          </div>
          <div class="cs-griglia cs-griglia-compact">
            <!-- Header specialisti compatto -->
            <div class="cs-griglia-header cs-griglia-header-compact">
              <div class="cs-angolo cs-angolo-compact"></div>
              ${this.specialisti.map(spec => `
                <div class="cs-spec-header cs-spec-header-compact" style="border-top:3px solid ${spec.colore || '#4F46E5'}">
                  <span class="cs-spec-iniziali" style="background:${spec.colore || '#4F46E5'}">${(spec.nome || '')[0]}${(spec.cognome || '')[0]}</span>
                </div>
              `).join('')}
            </div>
            <div class="cs-griglia-body">
      `;

      this.oreCalendario.forEach(ora => {
        const oraStr = `${ora.toString().padStart(2, '0')}:00`;

        html += `<div class="cs-riga">`;
        html += `<div class="cs-label-ora cs-label-ora-compact">${oraStr}</div>`;

        this.specialisti.forEach(spec => {
          const stato = this.getStatoSlot(spec.id, dataStr, giornoSett, ora, 0);
          const appSlot = this.getAppuntamentoSlot(spec.id, dataStr, ora, 0);

          if (appSlot) {
            html += `
              <div class="cs-slot cs-slot-compact cs-slot-occupato" data-app-id="${appSlot.id}" title="${this.escapeHtml(appSlot.clienteNome || 'Prenotato')}">
                <div class="cs-dot" style="background:${spec.colore || '#4F46E5'}"></div>
              </div>
            `;
          } else if (stato === 'disponibile') {
            html += `
              <div class="cs-slot cs-slot-compact cs-slot-disponibile" data-spec-id="${spec.id}" data-data="${dataStr}" data-ora="${ora}" data-minuto="0">
              </div>
            `;
          } else if (stato === 'non_disponibile') {
            html += `<div class="cs-slot cs-slot-compact cs-slot-non-disponibile"></div>`;
          } else {
            html += `<div class="cs-slot cs-slot-compact cs-slot-vuoto"></div>`;
          }
        });

        html += `</div>`;
      });

      html += `</div></div></div>`;
    });

    html += `</div>`;
    return html;
  },

  /**
   * Bind eventi sul calendario renderizzato
   */
  bindCalendarioEvents(container) {
    // Click su slot disponibile → prenota
    container.querySelectorAll('.cs-slot-disponibile').forEach(slot => {
      slot.addEventListener('click', () => {
        const specId = slot.dataset.specId;
        const data = slot.dataset.data;
        const ora = parseInt(slot.dataset.ora);
        const minuto = parseInt(slot.dataset.minuto || 0);
        this.openModalPrenotazione(specId, data, ora, minuto);
      });
    });

    // Click su slot occupato → dettaglio
    container.querySelectorAll('.cs-slot-occupato').forEach(slot => {
      slot.addEventListener('click', () => {
        const appId = slot.dataset.appId;
        this.openModalDettaglioPrenotazione(appId);
      });
    });
  },

  // =========================================
  // LOGICA DISPONIBILITÀ
  // =========================================

  /**
   * Determina lo stato di uno slot:
   * 'disponibile', 'non_disponibile', null (nessuna info)
   */
  getStatoSlot(specialistaId, dataStr, giornoSettimana, ora, minuto) {
    // Controlla prima le regole per data specifica (hanno priorità)
    const specifiche = this.disponibilita.filter(d =>
      d.specialistaId === specialistaId &&
      d.tipo_periodo === 'specifica' &&
      d.data === dataStr
    );

    for (const disp of specifiche) {
      if (this.isOraInRange(ora, minuto, disp.oraInizio, disp.oraFine)) {
        return disp.modalita; // 'disponibile' o 'non_disponibile'
      }
    }

    // Poi controlla regole ricorrenti
    const ricorrenti = this.disponibilita.filter(d =>
      d.specialistaId === specialistaId &&
      d.tipo_periodo === 'ricorrente' &&
      d.giorniSettimana && d.giorniSettimana.includes(giornoSettimana)
    );

    for (const disp of ricorrenti) {
      if (this.isOraInRange(ora, minuto, disp.oraInizio, disp.oraFine)) {
        return disp.modalita;
      }
    }

    return null; // Nessuna info
  },

  /**
   * Verifica se un'ora:minuto è nel range
   */
  isOraInRange(ora, minuto, oraInizioStr, oraFineStr) {
    if (!oraInizioStr || !oraFineStr) return false;

    const [hI, mI] = oraInizioStr.split(':').map(Number);
    const [hF, mF] = oraFineStr.split(':').map(Number);

    const slotMin = ora * 60 + minuto;
    const inizioMin = hI * 60 + mI;
    const fineMin = hF * 60 + mF;

    return slotMin >= inizioMin && slotMin < fineMin;
  },

  /**
   * Trova appuntamento per uno slot specifico
   */
  getAppuntamentoSlot(specialistaId, dataStr, ora, minuto) {
    return this.appuntamenti.find(app => {
      if (app.specialistaId !== specialistaId) return false;

      const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
      const appDataStr = this.formatDate(appData);

      if (appDataStr !== dataStr) return false;

      return appData.getHours() === ora && appData.getMinutes() === minuto;
    });
  },

  // =========================================
  // GESTIONE SPECIALISTI
  // =========================================

  openModalGestisciSpecialisti() {
    this.renderListaSpecialisti();
    document.getElementById('modal-gestisci-spec').style.display = 'flex';
  },

  renderListaSpecialisti() {
    const lista = document.getElementById('lista-specialisti');
    if (!lista) return;

    if (this.specialisti.length === 0) {
      lista.innerHTML = '<p class="text-muted">Nessuno specialista configurato.</p>';
      return;
    }

    lista.innerHTML = this.specialisti.map(spec => `
      <div class="spec-card">
        <div class="spec-card-info">
          <div class="cs-spec-avatar" style="background:${spec.colore || '#4F46E5'}">${(spec.nome || '')[0]}${(spec.cognome || '')[0]}</div>
          <div>
            <div class="spec-card-nome">${this.escapeHtml(spec.nome)} ${this.escapeHtml(spec.cognome)}</div>
            <div class="spec-card-dettaglio">Slot default: ${spec.durataSlotDefault || 60} min</div>
          </div>
        </div>
        <div class="spec-card-actions">
          <button class="btn btn-secondary btn-sm" data-edit-spec="${spec.id}">Modifica</button>
          <button class="btn btn-danger btn-sm" data-delete-spec="${spec.id}">Rimuovi</button>
        </div>
      </div>
    `).join('');

    // Bind edit/delete
    lista.querySelectorAll('[data-edit-spec]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openModalModificaSpecialista(btn.dataset.editSpec);
      });
    });

    lista.querySelectorAll('[data-delete-spec]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleDeleteSpecialista(btn.dataset.deleteSpec);
      });
    });
  },

  openModalNuovoSpecialista() {
    document.getElementById('form-nuovo-spec').reset();
    document.getElementById('spec-id').value = '';
    document.getElementById('modal-spec-title').textContent = 'Nuovo Specialista';
    document.getElementById('modal-nuovo-spec').style.display = 'flex';
  },

  openModalModificaSpecialista(specId) {
    const spec = this.specialisti.find(s => s.id === specId);
    if (!spec) return;

    document.getElementById('spec-id').value = spec.id;
    document.getElementById('spec-nome').value = spec.nome || '';
    document.getElementById('spec-cognome').value = spec.cognome || '';
    document.getElementById('spec-colore').value = spec.colore || '#4F46E5';
    document.getElementById('spec-durata-default').value = spec.durataSlotDefault || 60;
    document.getElementById('modal-spec-title').textContent = 'Modifica Specialista';
    document.getElementById('modal-nuovo-spec').style.display = 'flex';
  },

  async handleSaveSpecialista(e) {
    e.preventDefault();

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const specId = document.getElementById('spec-id').value;
    const isEdit = !!specId;

    const data = {
      nome: document.getElementById('spec-nome').value.trim(),
      cognome: document.getElementById('spec-cognome').value.trim(),
      colore: document.getElementById('spec-colore').value,
      durataSlotDefault: parseInt(document.getElementById('spec-durata-default').value) || 60,
      attivo: true,
      dataModifica: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (isEdit) {
        await db.collection('specialisti').doc(specId).update(data);
        App.showToast('Specialista aggiornato', 'success');
      } else {
        data.dataCreazione = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('specialisti').add(data);
        App.showToast('Specialista creato', 'success');
      }

      this.closeModal('modal-nuovo-spec');

      // Ricarica specialisti e aggiorna UI
      await this.loadSpecialisti();
      this.renderListaSpecialisti();
      this.renderCalendario();

    } catch (error) {
      console.error('Errore salvataggio specialista:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  async handleDeleteSpecialista(specId) {
    if (!confirm('Sei sicuro di voler rimuovere questo specialista?')) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('specialisti').doc(specId).update({ attivo: false });
      App.showToast('Specialista rimosso', 'success');

      await this.loadSpecialisti();
      this.renderListaSpecialisti();
      this.renderCalendario();

    } catch (error) {
      console.error('Errore rimozione specialista:', error);
      App.showToast('Errore durante la rimozione', 'error');
    }
  },

  // =========================================
  // GESTIONE DISPONIBILITÀ
  // =========================================

  openModalDisponibilita() {
    // Aggiorna dropdown specialisti nel modal
    const select = document.getElementById('disp-specialista');
    if (select) {
      select.innerHTML = `
        <option value="">-- Seleziona specialista --</option>
        ${this.specialisti.map(s => `<option value="${s.id}">${s.nome} ${s.cognome}</option>`).join('')}
      `;
    }

    document.getElementById('lista-disponibilita').innerHTML = '<p class="text-muted">Seleziona uno specialista per vedere le disponibilità.</p>';
    document.getElementById('modal-disponibilita').style.display = 'flex';
  },

  renderListaDisponibilita() {
    const specId = document.getElementById('disp-specialista')?.value;
    const lista = document.getElementById('lista-disponibilita');
    if (!lista) return;

    if (!specId) {
      lista.innerHTML = '<p class="text-muted">Seleziona uno specialista per vedere le disponibilità.</p>';
      return;
    }

    const dispSpec = this.disponibilita.filter(d => d.specialistaId === specId);

    if (dispSpec.length === 0) {
      lista.innerHTML = '<p class="text-muted">Nessuna disponibilità configurata per questo specialista.</p>';
      return;
    }

    const giorniNomi = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

    lista.innerHTML = dispSpec.map(d => {
      const tipoLabel = d.modalita === 'disponibile' ? '✅ Disponibile' : '🚫 Non disponibile';
      let periodoLabel = '';

      if (d.tipo_periodo === 'ricorrente' && d.giorniSettimana) {
        periodoLabel = 'Ogni ' + d.giorniSettimana.map(g => giorniNomi[g]).join(', ');
      } else if (d.tipo_periodo === 'specifica') {
        periodoLabel = `Data: ${d.data}`;
      }

      return `
        <div class="disp-card">
          <div class="disp-card-info">
            <div class="disp-card-tipo">${tipoLabel}</div>
            <div class="disp-card-periodo">${periodoLabel}</div>
            <div class="disp-card-orario">${d.oraInizio} - ${d.oraFine}</div>
          </div>
          <button class="btn btn-danger btn-sm" data-delete-disp="${d.id}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      `;
    }).join('');

    // Bind delete
    lista.querySelectorAll('[data-delete-disp]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleDeleteDisponibilita(btn.dataset.deleteDisp);
      });
    });
  },

  async handleSaveDisponibilita() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const specId = document.getElementById('disp-specialista')?.value;
    if (!specId) {
      App.showToast('Seleziona uno specialista', 'warning');
      return;
    }

    // Modalità
    const isDisponibile = document.getElementById('disp-mode-disponibile')?.classList.contains('active');
    const modalita = isDisponibile ? 'disponibile' : 'non_disponibile';

    // Tipo periodo
    const isRicorrente = document.getElementById('disp-tipo-ricorrente')?.classList.contains('active');
    const tipo_periodo = isRicorrente ? 'ricorrente' : 'specifica';

    // Orari
    const oraInizio = document.getElementById('disp-ora-inizio')?.value;
    const oraFine = document.getElementById('disp-ora-fine')?.value;

    if (!oraInizio || !oraFine) {
      App.showToast('Inserisci orario di inizio e fine', 'warning');
      return;
    }

    if (oraInizio >= oraFine) {
      App.showToast('L\'ora di inizio deve essere prima dell\'ora di fine', 'warning');
      return;
    }

    const data = {
      specialistaId: specId,
      modalita: modalita,
      tipo_periodo: tipo_periodo,
      oraInizio: oraInizio,
      oraFine: oraFine,
      dataCreazione: firebase.firestore.FieldValue.serverTimestamp()
    };

    if (isRicorrente) {
      const giorniChecked = [];
      document.querySelectorAll('.giorni-settimana-selector input:checked').forEach(cb => {
        giorniChecked.push(parseInt(cb.value));
      });

      if (giorniChecked.length === 0) {
        App.showToast('Seleziona almeno un giorno della settimana', 'warning');
        return;
      }

      data.giorniSettimana = giorniChecked;
    } else {
      const dataSpecifica = document.getElementById('disp-data')?.value;
      if (!dataSpecifica) {
        App.showToast('Seleziona una data', 'warning');
        return;
      }
      data.data = dataSpecifica;
    }

    try {
      await db.collection('disponibilita_specialisti').add(data);
      App.showToast('Disponibilità salvata', 'success');
      this.renderListaDisponibilita();
    } catch (error) {
      console.error('Errore salvataggio disponibilità:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  async handleDeleteDisponibilita(dispId) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('disponibilita_specialisti').doc(dispId).delete();
      App.showToast('Disponibilità rimossa', 'success');
      this.renderListaDisponibilita();
    } catch (error) {
      console.error('Errore eliminazione disponibilità:', error);
    }
  },

  // =========================================
  // PRENOTAZIONI
  // =========================================

  openModalPrenotazione(specId, data, ora, minuto) {
    const spec = this.specialisti.find(s => s.id === specId);
    if (!spec) return;

    document.getElementById('prenota-spec-id').value = specId;
    document.getElementById('prenota-data').value = data;
    document.getElementById('prenota-ora').value = `${ora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;

    // Durata default dello specialista
    document.getElementById('prenota-durata').value = spec.durataSlotDefault || 60;

    // Riepilogo
    const riepilogo = document.getElementById('prenota-riepilogo');
    const giorniNomi = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const dataObj = new Date(data + 'T00:00:00');
    const dataLabel = `${giorniNomi[dataObj.getDay()]} ${dataObj.getDate()}/${(dataObj.getMonth() + 1).toString().padStart(2, '0')}/${dataObj.getFullYear()}`;
    const oraLabel = `${ora.toString().padStart(2, '0')}:${minuto.toString().padStart(2, '0')}`;

    riepilogo.innerHTML = `
      <div class="prenota-riepilogo-content">
        <div class="cs-spec-avatar" style="background:${spec.colore || '#4F46E5'};width:36px;height:36px;font-size:14px">${(spec.nome || '')[0]}${(spec.cognome || '')[0]}</div>
        <div>
          <strong>${this.escapeHtml(spec.nome)} ${this.escapeHtml(spec.cognome)}</strong><br>
          <span class="text-muted">${dataLabel} alle ${oraLabel}</span>
        </div>
      </div>
    `;

    // Reset form
    document.getElementById('prenota-cliente').value = '';
    document.getElementById('prenota-titolo').value = '';
    document.getElementById('prenota-note').value = '';

    document.getElementById('modal-prenotazione-spec').style.display = 'flex';
  },

  async handleSavePrenotazione(e) {
    e.preventDefault();

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    const specId = document.getElementById('prenota-spec-id').value;
    const dataStr = document.getElementById('prenota-data').value;
    const oraStr = document.getElementById('prenota-ora').value;

    const spec = this.specialisti.find(s => s.id === specId);
    const clienteSelect = document.getElementById('prenota-cliente');
    const clienteId = clienteSelect.value;
    const clienteNome = clienteSelect.options[clienteSelect.selectedIndex]?.dataset?.nome || '';

    if (!clienteId) {
      App.showToast('Seleziona un cliente', 'warning');
      return;
    }

    const dataOra = new Date(`${dataStr}T${oraStr}`);

    const appData = {
      specialistaId: specId,
      specialistaNome: spec ? `${spec.nome} ${spec.cognome}` : '',
      clienteId: clienteId,
      clienteNome: clienteNome,
      titolo: document.getElementById('prenota-titolo').value.trim() || `Appuntamento con ${spec?.nome || 'specialista'}`,
      data: firebase.firestore.Timestamp.fromDate(dataOra),
      durata: parseInt(document.getElementById('prenota-durata').value) || 60,
      tipo: document.getElementById('prenota-tipo').value,
      note: document.getElementById('prenota-note').value.trim(),
      creatoDa: user?.id || '',
      creatoDaNome: user ? `${user.nome} ${user.cognome}` : '',
      dataCreazione: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('appuntamenti_specialisti').add(appData);
      App.showToast('Appuntamento prenotato!', 'success');
      this.closeModal('modal-prenotazione-spec');
    } catch (error) {
      console.error('Errore prenotazione:', error);
      App.showToast('Errore durante la prenotazione', 'error');
    }
  },

  openModalDettaglioPrenotazione(appId) {
    const app = this.appuntamenti.find(a => a.id === appId);
    if (!app) return;

    this._currentPrenotazioneId = appId;

    const appData = app.data?.toDate?.() ? app.data.toDate() : new Date(app.data);
    const dataStr = appData.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const oraStr = `${appData.getHours().toString().padStart(2, '0')}:${appData.getMinutes().toString().padStart(2, '0')}`;

    const tipoLabel = { 'chiamata': '📞 Chiamata', 'videocall': '💻 Videocall', 'incontro': '🤝 Incontro' };

    document.getElementById('dettaglio-prenota-title').textContent = app.titolo || 'Prenotazione';

    document.getElementById('dettaglio-prenota-body').innerHTML = `
      <div class="dettaglio-app-info">
        <div class="info-field">
          <span class="info-label">Specialista</span>
          <span class="info-value">${this.escapeHtml(app.specialistaNome || '-')}</span>
        </div>
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
          <span class="info-value">${tipoLabel[app.tipo] || app.tipo || '-'}</span>
        </div>
        <div class="info-field">
          <span class="info-label">Durata</span>
          <span class="info-value">${app.durata || 60} minuti</span>
        </div>
        <div class="info-field">
          <span class="info-label">Prenotato da</span>
          <span class="info-value">${this.escapeHtml(app.creatoDaNome || '-')}</span>
        </div>
        ${app.note ? `
          <div class="info-field">
            <span class="info-label">Note</span>
            <span class="info-value">${this.escapeHtml(app.note)}</span>
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('modal-dettaglio-prenota').style.display = 'flex';
  },

  async handleEliminaPrenotazione() {
    const appId = document.getElementById('elimina-prenota-id').value;
    if (!appId) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('appuntamenti_specialisti').doc(appId).delete();
      App.showToast('Prenotazione eliminata', 'success');
      this.closeModal('modal-elimina-prenota');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      App.showToast('Errore durante l\'eliminazione', 'error');
    }
  },

  // =========================================
  // UTILITIES
  // =========================================

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
  },

  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export globale
window.CalendarioSpecialistiModule = CalendarioSpecialistiModule;
