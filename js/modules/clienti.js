// Modulo Clienti per CRM Strategica
// ==================================
// Gestisce la lista clienti, creazione, modifica, stati e storico

const ClientiModule = {
  
  // Riferimenti DOM
  container: null,
  unsubscribe: null, // Per listener Firebase real-time
  
  // Stati disponibili per le pratiche
  STATI_PRATICA: [
    { id: 'nuovo', label: 'Nuovo', color: 'primary' },
    { id: 'contattato', label: 'Contattato', color: 'warning' },
    { id: 'in_lavorazione', label: 'In Lavorazione', color: 'warning' },
    { id: 'proposta_inviata', label: 'Proposta Inviata', color: 'secondary' },
    { id: 'chiuso_vinto', label: 'Chiuso Vinto', color: 'success' },
    { id: 'chiuso_perso', label: 'Chiuso Perso', color: 'danger' }
  ],

  // Dati correnti
  clienti: [],
  filtri: {
    ricerca: '',
    stato: '',
    consulente: ''
  },

  /**
   * Inizializza il modulo
   */
  init() {
    this.container = document.getElementById('module-container');
    if (!this.container) return;
    
    this.render();
    this.setupEventListeners();
    this.loadClienti();
  },

  /**
   * Pulizia quando si esce dal modulo
   */
  cleanup() {
    // Rimuove listener Firebase real-time
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  },

  /**
   * Renderizza l'HTML del modulo
   */
  render() {
    const user = AuthManager.getCurrentUser();
    const isAdmin = user?.ruolo === 'admin';
    const isTeamManager = user?.ruolo === 'team_manager';

    this.container.innerHTML = `
      <div class="clienti-module">
        
        <!-- Barra Azioni -->
        <div class="clienti-toolbar">
          <div class="toolbar-left">
            <!-- Ricerca -->
            <div class="search-box">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input 
                type="text" 
                id="clienti-search" 
                class="search-input" 
                placeholder="Cerca cliente..."
              >
            </div>
            
            <!-- Filtro Stato -->
            <select id="filtro-stato" class="filtro-select">
              <option value="">Tutti gli stati</option>
              ${this.STATI_PRATICA.map(s => `
                <option value="${s.id}">${s.label}</option>
              `).join('')}
            </select>
            
            <!-- Filtro Consulente (solo Admin e Team Manager) -->
            ${isAdmin || isTeamManager ? `
              <select id="filtro-consulente" class="filtro-select">
                <option value="">Tutti i consulenti</option>
              </select>
            ` : ''}
          </div>
          
          <div class="toolbar-right">
            <button id="btn-nuovo-cliente" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 20px; height: 20px;">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuovo Cliente
            </button>
          </div>
        </div>
        
        <!-- Statistiche Rapide -->
        <div class="clienti-stats">
          <div class="stat-card">
            <div class="stat-number" id="stat-totale">0</div>
            <div class="stat-label">Totale Clienti</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="stat-nuovi">0</div>
            <div class="stat-label">Nuovi</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="stat-lavorazione">0</div>
            <div class="stat-label">In Lavorazione</div>
          </div>
          <div class="stat-card">
            <div class="stat-number" id="stat-vinti">0</div>
            <div class="stat-label">Chiusi Vinti</div>
          </div>
        </div>
        
        <!-- Tabella Clienti -->
        <div class="clienti-table-container">
          <table class="clienti-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contatti</th>
                <th>Azienda</th>
                <th>Stato</th>
                <th>Consulente</th>
                <th>Data</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody id="clienti-tbody">
              <tr>
                <td colspan="7" class="loading-row">
                  <div class="loading-spinner"></div>
                  Caricamento clienti...
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Empty State -->
        <div id="clienti-empty" class="clienti-empty hidden">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
          <h3>Nessun cliente trovato</h3>
          <p>Inizia aggiungendo il tuo primo cliente</p>
        </div>
        
      </div>
      
      <!-- MODAL: Nuovo/Modifica Cliente -->
      <div id="modal-cliente" class="modal-overlay hidden">
        <div class="modal-container">
          <div class="modal-header">
            <h2 id="modal-cliente-title">Nuovo Cliente</h2>
            <button class="modal-close" data-close-modal="modal-cliente">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form id="form-cliente" class="modal-body">
            <input type="hidden" id="cliente-id">
            
            <div class="form-row">
              <div class="form-group">
                <label for="cliente-nome" class="form-label">Nome *</label>
                <input type="text" id="cliente-nome" class="form-input" required>
              </div>
              <div class="form-group">
                <label for="cliente-cognome" class="form-label">Cognome *</label>
                <input type="text" id="cliente-cognome" class="form-input" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="cliente-email" class="form-label">Email *</label>
                <input type="email" id="cliente-email" class="form-input" required>
              </div>
              <div class="form-group">
                <label for="cliente-telefono" class="form-label">Telefono</label>
                <input type="tel" id="cliente-telefono" class="form-input">
              </div>
            </div>
            
            <div class="form-group">
              <label for="cliente-azienda" class="form-label">Azienda</label>
              <input type="text" id="cliente-azienda" class="form-input">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="cliente-stato" class="form-label">Stato Pratica</label>
                <select id="cliente-stato" class="form-input">
                  ${this.STATI_PRATICA.map(s => `
                    <option value="${s.id}">${s.label}</option>
                  `).join('')}
                </select>
              </div>
              
              ${isAdmin || isTeamManager ? `
                <div class="form-group">
                  <label for="cliente-consulente" class="form-label">Assegna a</label>
                  <select id="cliente-consulente" class="form-input">
                    <option value="">-- Seleziona consulente --</option>
                  </select>
                </div>
              ` : ''}
            </div>
            
            <div class="form-group">
              <label for="cliente-note" class="form-label">Note</label>
              <textarea id="cliente-note" class="form-input form-textarea" rows="3"></textarea>
            </div>
          </form>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-cliente">
              Annulla
            </button>
            <button type="submit" form="form-cliente" class="btn btn-primary">
              Salva Cliente
            </button>
          </div>
        </div>
      </div>
      
      <!-- MODAL: Dettaglio Cliente / Storico -->
      <div id="modal-dettaglio" class="modal-overlay hidden">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <h2 id="modal-dettaglio-title">Dettaglio Cliente</h2>
            <button class="modal-close" data-close-modal="modal-dettaglio">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <!-- Info Cliente -->
            <div class="dettaglio-info" id="dettaglio-info">
              <!-- Popolato dinamicamente -->
            </div>
            
            <!-- Cambio Stato Rapido -->
            <div class="dettaglio-stato">
              <h4>Cambia Stato Pratica</h4>
              <div class="stati-buttons" id="stati-buttons">
                <!-- Popolato dinamicamente -->
              </div>
            </div>
            
            <!-- Storico Modifiche -->
            <div class="dettaglio-storico">
              <h4>Storico Modifiche</h4>
              <div class="storico-timeline" id="storico-timeline">
                <!-- Popolato dinamicamente -->
              </div>
            </div>
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-dettaglio">
              Chiudi
            </button>
            <button type="button" id="btn-modifica-cliente" class="btn btn-primary">
              Modifica Cliente
            </button>
          </div>
        </div>
      </div>
      
      <!-- MODAL: Conferma Eliminazione -->
      <div id="modal-elimina" class="modal-overlay hidden">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2>Conferma Eliminazione</h2>
            <button class="modal-close" data-close-modal="modal-elimina">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div class="modal-body">
            <p>Sei sicuro di voler eliminare questo cliente?</p>
            <p class="text-muted">Questa azione non può essere annullata.</p>
            <input type="hidden" id="elimina-cliente-id">
          </div>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-elimina">
              Annulla
            </button>
            <button type="button" id="btn-conferma-elimina" class="btn btn-danger">
              Elimina
            </button>
          </div>
        </div>
      </div>
    `;
    
    // Carica lista consulenti per i filtri
    this.loadConsulenti();
  },

  /**
   * Setup degli event listener
   */
  setupEventListeners() {
    // Ricerca
    const searchInput = document.getElementById('clienti-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filtri.ricerca = e.target.value.toLowerCase();
        this.renderClienti();
      });
    }

    // Filtro stato
    const filtroStato = document.getElementById('filtro-stato');
    if (filtroStato) {
      filtroStato.addEventListener('change', (e) => {
        this.filtri.stato = e.target.value;
        this.renderClienti();
      });
    }

    // Filtro consulente
    const filtroConsulente = document.getElementById('filtro-consulente');
    if (filtroConsulente) {
      filtroConsulente.addEventListener('change', (e) => {
        this.filtri.consulente = e.target.value;
        this.renderClienti();
      });
    }

    // Nuovo cliente
    const btnNuovo = document.getElementById('btn-nuovo-cliente');
    if (btnNuovo) {
      btnNuovo.addEventListener('click', () => this.openModalNuovo());
    }

    // Form cliente submit
    const formCliente = document.getElementById('form-cliente');
    if (formCliente) {
      formCliente.addEventListener('submit', (e) => this.handleSaveCliente(e));
    }

    // Chiudi modal
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.closeModal;
        this.closeModal(modalId);
      });
    });

    // Click su overlay per chiudere
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.add('hidden');
        }
      });
    });

    // Conferma eliminazione
    const btnConfermaElimina = document.getElementById('btn-conferma-elimina');
    if (btnConfermaElimina) {
      btnConfermaElimina.addEventListener('click', () => this.handleEliminaCliente());
    }

    // Modifica da dettaglio
    const btnModifica = document.getElementById('btn-modifica-cliente');
    if (btnModifica) {
      btnModifica.addEventListener('click', () => {
        const clienteId = document.getElementById('modal-dettaglio').dataset.clienteId;
        this.closeModal('modal-dettaglio');
        this.openModalModifica(clienteId);
      });
    }

    // Event delegation per azioni sulla tabella
    const tbody = document.getElementById('clienti-tbody');
    if (tbody) {
      tbody.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;

        const action = btn.dataset.action;
        const clienteId = btn.dataset.id;

        switch (action) {
          case 'view':
            this.openModalDettaglio(clienteId);
            break;
          case 'edit':
            this.openModalModifica(clienteId);
            break;
          case 'delete':
            this.openModalElimina(clienteId);
            break;
        }
      });
    }
  },

  /**
   * Carica i clienti da Firebase (real-time)
   */
  loadClienti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      console.error('Database non disponibile');
      return;
    }

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    let query = db.collection('clienti');

    // Filtro per ruolo
    if (user.ruolo === 'consulente') {
      // Consulente vede solo i suoi clienti
      query = query.where('consulenteId', '==', user.id);
    } else if (user.ruolo === 'team_manager') {
      // Team Manager vede i clienti del suo team
      // Per ora mostra tutti, poi filtrerà lato client
    }
    // Admin vede tutti

    // Real-time listener
    this.unsubscribe = query.orderBy('dataCreazione', 'desc').onSnapshot(
      (snapshot) => {
        this.clienti = [];
        snapshot.forEach(doc => {
          this.clienti.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // Filtro aggiuntivo per Team Manager
        if (user.ruolo === 'team_manager') {
          this.clienti = this.clienti.filter(c => 
            c.teamManagerId === user.id || c.consulenteId === user.id
          );
        }

        this.renderClienti();
        this.updateStats();
      },
      (error) => {
        console.error('Errore caricamento clienti:', error);
        App.showToast('Errore nel caricamento clienti', 'error');
      }
    );
  },

  /**
   * Carica lista consulenti per i dropdown
   */
  async loadConsulenti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    try {
      let query = db.collection('users').where('attivo', '==', true);
      
      const snapshot = await query.get();
      const consulenti = [];
      
      snapshot.forEach(doc => {
        const userData = doc.data();
        // Filtro per team manager: mostra solo i consulenti del suo team
        if (user.ruolo === 'team_manager') {
          if (userData.teamManagerId === user.id || doc.id === user.id) {
            consulenti.push({ id: doc.id, ...userData });
          }
        } else if (user.ruolo === 'admin') {
          consulenti.push({ id: doc.id, ...userData });
        }
      });

      // Popola dropdown filtro
      const filtroConsulente = document.getElementById('filtro-consulente');
      if (filtroConsulente) {
        consulenti.forEach(c => {
          const option = document.createElement('option');
          option.value = c.id;
          option.textContent = `${c.nome} ${c.cognome}`;
          filtroConsulente.appendChild(option);
        });
      }

      // Popola dropdown form
      const selectConsulente = document.getElementById('cliente-consulente');
      if (selectConsulente) {
        consulenti.forEach(c => {
          const option = document.createElement('option');
          option.value = c.id;
          option.textContent = `${c.nome} ${c.cognome} (${c.ruolo})`;
          selectConsulente.appendChild(option);
        });
      }

      // Salva per uso futuro
      this.consulenti = consulenti;

    } catch (error) {
      console.error('Errore caricamento consulenti:', error);
    }
  },

  /**
   * Renderizza la tabella clienti filtrata
   */
  renderClienti() {
    const tbody = document.getElementById('clienti-tbody');
    const emptyState = document.getElementById('clienti-empty');
    if (!tbody) return;

    // Applica filtri
    let clientiFiltrati = this.clienti.filter(cliente => {
      // Filtro ricerca
      if (this.filtri.ricerca) {
        const searchText = this.filtri.ricerca.toLowerCase();
        const match = 
          (cliente.nome?.toLowerCase() || '').includes(searchText) ||
          (cliente.cognome?.toLowerCase() || '').includes(searchText) ||
          (cliente.email?.toLowerCase() || '').includes(searchText) ||
          (cliente.azienda?.toLowerCase() || '').includes(searchText) ||
          (cliente.telefono || '').includes(searchText);
        if (!match) return false;
      }

      // Filtro stato
      if (this.filtri.stato && cliente.stato !== this.filtri.stato) {
        return false;
      }

      // Filtro consulente
      if (this.filtri.consulente && cliente.consulenteId !== this.filtri.consulente) {
        return false;
      }

      return true;
    });

    // Empty state
    if (clientiFiltrati.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      return;
    }

    emptyState?.classList.add('hidden');

    // Renderizza righe
    tbody.innerHTML = clientiFiltrati.map(cliente => {
      const stato = this.STATI_PRATICA.find(s => s.id === cliente.stato) || this.STATI_PRATICA[0];
      const consulente = this.consulenti?.find(c => c.id === cliente.consulenteId);
      const dataCreazione = cliente.dataCreazione?.toDate 
        ? cliente.dataCreazione.toDate().toLocaleDateString('it-IT')
        : '-';

      return `
        <tr data-id="${cliente.id}">
          <td>
            <div class="cliente-nome">
              <strong>${this.escapeHtml(cliente.nome)} ${this.escapeHtml(cliente.cognome)}</strong>
            </div>
          </td>
          <td>
            <div class="cliente-contatti">
              <div>${this.escapeHtml(cliente.email || '-')}</div>
              <small class="text-muted">${this.escapeHtml(cliente.telefono || '-')}</small>
            </div>
          </td>
          <td>${this.escapeHtml(cliente.azienda || '-')}</td>
          <td>
            <span class="badge badge-${stato.color}">${stato.label}</span>
          </td>
          <td>
            ${consulente ? `${consulente.nome} ${consulente.cognome}` : '-'}
          </td>
          <td>${dataCreazione}</td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" data-action="view" data-id="${cliente.id}" title="Visualizza">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              <button class="btn-icon" data-action="edit" data-id="${cliente.id}" title="Modifica">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button class="btn-icon btn-icon-danger" data-action="delete" data-id="${cliente.id}" title="Elimina">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Aggiorna le statistiche
   */
  updateStats() {
    const totale = this.clienti.length;
    const nuovi = this.clienti.filter(c => c.stato === 'nuovo').length;
    const inLavorazione = this.clienti.filter(c => 
      c.stato === 'contattato' || c.stato === 'in_lavorazione' || c.stato === 'proposta_inviata'
    ).length;
    const vinti = this.clienti.filter(c => c.stato === 'chiuso_vinto').length;

    document.getElementById('stat-totale').textContent = totale;
    document.getElementById('stat-nuovi').textContent = nuovi;
    document.getElementById('stat-lavorazione').textContent = inLavorazione;
    document.getElementById('stat-vinti').textContent = vinti;
  },

  /**
   * Apre modal per nuovo cliente
   */
  openModalNuovo() {
    const modal = document.getElementById('modal-cliente');
    const form = document.getElementById('form-cliente');
    const title = document.getElementById('modal-cliente-title');
    
    form.reset();
    document.getElementById('cliente-id').value = '';
    title.textContent = 'Nuovo Cliente';
    
    // Imposta consulente di default (utente corrente se consulente)
    const user = AuthManager.getCurrentUser();
    if (user.ruolo === 'consulente') {
      const selectConsulente = document.getElementById('cliente-consulente');
      if (selectConsulente) {
        selectConsulente.value = user.id;
      }
    }
    
    modal.classList.remove('hidden');
  },

  /**
   * Apre modal per modificare cliente
   */
  openModalModifica(clienteId) {
    const cliente = this.clienti.find(c => c.id === clienteId);
    if (!cliente) return;

    const modal = document.getElementById('modal-cliente');
    const title = document.getElementById('modal-cliente-title');
    
    title.textContent = 'Modifica Cliente';
    
    // Popola form
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome').value = cliente.nome || '';
    document.getElementById('cliente-cognome').value = cliente.cognome || '';
    document.getElementById('cliente-email').value = cliente.email || '';
    document.getElementById('cliente-telefono').value = cliente.telefono || '';
    document.getElementById('cliente-azienda').value = cliente.azienda || '';
    document.getElementById('cliente-stato').value = cliente.stato || 'nuovo';
    document.getElementById('cliente-note').value = cliente.note || '';
    
    const selectConsulente = document.getElementById('cliente-consulente');
    if (selectConsulente) {
      selectConsulente.value = cliente.consulenteId || '';
    }
    
    modal.classList.remove('hidden');
  },

  /**
   * Apre modal dettaglio con storico
   */
  openModalDettaglio(clienteId) {
    const cliente = this.clienti.find(c => c.id === clienteId);
    if (!cliente) return;

    const modal = document.getElementById('modal-dettaglio');
    const title = document.getElementById('modal-dettaglio-title');
    const infoContainer = document.getElementById('dettaglio-info');
    const statiButtons = document.getElementById('stati-buttons');
    const timeline = document.getElementById('storico-timeline');

    modal.dataset.clienteId = clienteId;
    title.textContent = `${cliente.nome} ${cliente.cognome}`;

    // Info cliente
    const consulente = this.consulenti?.find(c => c.id === cliente.consulenteId);
    const stato = this.STATI_PRATICA.find(s => s.id === cliente.stato) || this.STATI_PRATICA[0];
    
    infoContainer.innerHTML = `
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Email</span>
          <span class="info-value">${this.escapeHtml(cliente.email || '-')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Telefono</span>
          <span class="info-value">${this.escapeHtml(cliente.telefono || '-')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Azienda</span>
          <span class="info-value">${this.escapeHtml(cliente.azienda || '-')}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Consulente</span>
          <span class="info-value">${consulente ? `${consulente.nome} ${consulente.cognome}` : '-'}</span>
        </div>
        <div class="info-item info-item-full">
          <span class="info-label">Note</span>
          <span class="info-value">${this.escapeHtml(cliente.note || '-')}</span>
        </div>
      </div>
    `;

    // Pulsanti cambio stato
    statiButtons.innerHTML = this.STATI_PRATICA.map(s => `
      <button 
        class="stato-btn ${s.id === cliente.stato ? 'active' : ''}" 
        data-stato="${s.id}"
        data-cliente-id="${clienteId}"
      >
        <span class="stato-dot stato-${s.color}"></span>
        ${s.label}
      </button>
    `).join('');

    // Event listener per cambio stato
    statiButtons.querySelectorAll('.stato-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const nuovoStato = e.currentTarget.dataset.stato;
        const id = e.currentTarget.dataset.clienteId;
        this.cambiaStato(id, nuovoStato);
      });
    });

    // Storico modifiche
    const storico = cliente.storico || [];
    if (storico.length === 0) {
      timeline.innerHTML = '<p class="text-muted">Nessuna modifica registrata</p>';
    } else {
      timeline.innerHTML = storico.slice().reverse().map(item => {
        const data = item.data?.toDate 
          ? item.data.toDate().toLocaleString('it-IT')
          : '-';
        return `
          <div class="timeline-item">
            <div class="timeline-dot"></div>
            <div class="timeline-content">
              <div class="timeline-text">${this.escapeHtml(item.descrizione)}</div>
              <div class="timeline-meta">
                <span>${this.escapeHtml(item.utente || 'Sistema')}</span>
                <span>${data}</span>
              </div>
            </div>
          </div>
        `;
      }).join('');
    }

    modal.classList.remove('hidden');
  },

  /**
   * Apre modal conferma eliminazione
   */
  openModalElimina(clienteId) {
    document.getElementById('elimina-cliente-id').value = clienteId;
    document.getElementById('modal-elimina').classList.remove('hidden');
  },

  /**
   * Chiude un modal
   */
  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
  },

  /**
   * Gestisce il salvataggio del cliente
   */
  async handleSaveCliente(e) {
    e.preventDefault();

    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Database non disponibile', 'error');
      return;
    }

    const user = AuthManager.getCurrentUser();
    const clienteId = document.getElementById('cliente-id').value;
    const isEdit = !!clienteId;

    // Raccogli dati form
    const clienteData = {
      nome: document.getElementById('cliente-nome').value.trim(),
      cognome: document.getElementById('cliente-cognome').value.trim(),
      email: document.getElementById('cliente-email').value.trim().toLowerCase(),
      telefono: document.getElementById('cliente-telefono').value.trim(),
      azienda: document.getElementById('cliente-azienda').value.trim(),
      stato: document.getElementById('cliente-stato').value,
      note: document.getElementById('cliente-note').value.trim(),
      dataModifica: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Consulente assegnato
    const selectConsulente = document.getElementById('cliente-consulente');
    if (selectConsulente) {
      clienteData.consulenteId = selectConsulente.value || null;
      // Trova il team manager del consulente
      const consulente = this.consulenti?.find(c => c.id === selectConsulente.value);
      clienteData.teamManagerId = consulente?.teamManagerId || null;
    } else {
      // Se non c'è il select, assegna all'utente corrente
      clienteData.consulenteId = user.id;
      clienteData.teamManagerId = user.teamManagerId || null;
    }

    try {
      if (isEdit) {
        // Modifica
        const clienteOld = this.clienti.find(c => c.id === clienteId);
        
        // Aggiungi allo storico
        const modifiche = [];
        if (clienteOld.nome !== clienteData.nome || clienteOld.cognome !== clienteData.cognome) {
          modifiche.push('Nome modificato');
        }
        if (clienteOld.stato !== clienteData.stato) {
          const vecchioStato = this.STATI_PRATICA.find(s => s.id === clienteOld.stato)?.label;
          const nuovoStato = this.STATI_PRATICA.find(s => s.id === clienteData.stato)?.label;
          modifiche.push(`Stato cambiato da "${vecchioStato}" a "${nuovoStato}"`);
        }
        if (clienteOld.consulenteId !== clienteData.consulenteId) {
          modifiche.push('Consulente assegnato modificato');
        }

        if (modifiche.length > 0) {
          clienteData.storico = firebase.firestore.FieldValue.arrayUnion({
            data: firebase.firestore.Timestamp.now(),
            utente: `${user.nome} ${user.cognome}`,
            descrizione: modifiche.join(', ')
          });
        }

        await db.collection('clienti').doc(clienteId).update(clienteData);
        App.showToast('Cliente aggiornato con successo', 'success');
        
        EventBus.emit(CRM_EVENTS.CLIENTE_UPDATED, { id: clienteId, ...clienteData });

      } else {
        // Nuovo cliente
        clienteData.dataCreazione = firebase.firestore.FieldValue.serverTimestamp();
        clienteData.storico = [{
          data: firebase.firestore.Timestamp.now(),
          utente: `${user.nome} ${user.cognome}`,
          descrizione: 'Cliente creato'
        }];

        const docRef = await db.collection('clienti').add(clienteData);
        App.showToast('Cliente creato con successo', 'success');
        
        EventBus.emit(CRM_EVENTS.CLIENTE_CREATED, { id: docRef.id, ...clienteData });
      }

      this.closeModal('modal-cliente');

    } catch (error) {
      console.error('Errore salvataggio cliente:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  /**
   * Cambia lo stato di un cliente
   */
  async cambiaStato(clienteId, nuovoStato) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    const cliente = this.clienti.find(c => c.id === clienteId);
    if (!cliente || cliente.stato === nuovoStato) return;

    const vecchioStato = this.STATI_PRATICA.find(s => s.id === cliente.stato)?.label;
    const statoLabel = this.STATI_PRATICA.find(s => s.id === nuovoStato)?.label;

    try {
      await db.collection('clienti').doc(clienteId).update({
        stato: nuovoStato,
        dataModifica: firebase.firestore.FieldValue.serverTimestamp(),
        storico: firebase.firestore.FieldValue.arrayUnion({
          data: firebase.firestore.Timestamp.now(),
          utente: `${user.nome} ${user.cognome}`,
          descrizione: `Stato cambiato da "${vecchioStato}" a "${statoLabel}"`
        })
      });

      App.showToast(`Stato aggiornato: ${statoLabel}`, 'success');
      
      // Aggiorna UI pulsanti stato
      document.querySelectorAll('.stato-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stato === nuovoStato);
      });

      EventBus.emit(CRM_EVENTS.STATO_CHANGED, { id: clienteId, stato: nuovoStato });

    } catch (error) {
      console.error('Errore cambio stato:', error);
      App.showToast('Errore nel cambio stato', 'error');
    }
  },

  /**
   * Elimina un cliente
   */
  async handleEliminaCliente() {
    const clienteId = document.getElementById('elimina-cliente-id').value;
    if (!clienteId) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('clienti').doc(clienteId).delete();
      App.showToast('Cliente eliminato', 'success');
      this.closeModal('modal-elimina');

    } catch (error) {
      console.error('Errore eliminazione:', error);
      App.showToast('Errore durante l\'eliminazione', 'error');
    }
  },

  /**
   * Utility: escape HTML per prevenire XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export globale
window.ClientiModule = ClientiModule;
