// Modulo Comunicazioni per CRM Strategica
// =========================================
// Gestisce le comunicazioni aziendali con badge non letto
// Solo Admin può creare/modificare, tutti possono leggere

const ComunicazioniModule = {
  
  // Nome del modulo
  name: 'comunicazioni',
  
  // Titolo visualizzato
  title: 'Comunicazioni',
  
  // Riferimento alla sottoscrizione real-time
  unsubscribe: null,
  
  // Cache delle comunicazioni
  comunicazioni: [],
  
  // ID comunicazione corrente (per dettaglio/modifica/elimina)
  currentComId: null,
  
  // ID delle comunicazioni lette dall'utente corrente (salvate in localStorage)
  letteIds: new Set(),

  /**
   * Inizializza il modulo
   */
  async init() {
    console.log('📢 Comunicazioni - Inizializzazione...');
    
    await this.loadLetteFromStorage();
    this.render();
    this.bindEvents();
    this.subscribeToRealtime();
    
    console.log('✅ Comunicazioni - Pronto!');
  },

  /**
   * Pulisce il modulo quando si esce
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    console.log('🧹 Comunicazioni - Cleanup completato');
  },

  /**
   * Carica le comunicazioni lette dal localStorage
   */
  async loadLetteFromStorage() {
    const user = AuthManager.getCurrentUser();
    if (!user) return;
    
    const key = `comunicazioni_lette_${user.id}`;
    const saved = StorageWrapper.get(key);
    if (saved && Array.isArray(saved)) {
      this.letteIds = new Set(saved);
    }
  },

  /**
   * Salva le comunicazioni lette nel localStorage
   */
  saveLetteToStorage() {
    const user = AuthManager.getCurrentUser();
    if (!user) return;
    
    const key = `comunicazioni_lette_${user.id}`;
    StorageWrapper.set(key, Array.from(this.letteIds));
  },

  /**
   * Sottoscrizione real-time a Firebase
   */
  subscribeToRealtime() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      console.error('Database non disponibile');
      this.showError('Errore di connessione al database');
      return;
    }

    // Sottoscrizione real-time ordinata per data decrescente
    this.unsubscribe = db.collection('comunicazioni')
      .orderBy('dataCreazione', 'desc')
      .onSnapshot(
        (snapshot) => {
          this.comunicazioni = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          this.renderList();
          this.updateBadge();
          this.updateStats();
        },
        (error) => {
          console.error('Errore real-time:', error);
          this.showError('Errore nel caricamento delle comunicazioni');
        }
      );
  },

  /**
   * Conta le comunicazioni non lette
   */
  countNonLette() {
    return this.comunicazioni.filter(c => !this.letteIds.has(c.id)).length;
  },

  /**
   * Aggiorna il badge nel menu di navigazione
   */
  updateBadge() {
    const count = this.countNonLette();
    const navItem = document.querySelector('[data-module="comunicazioni"]');
    
    if (!navItem) return;
    
    // Rimuovi badge esistente
    const existingBadge = navItem.querySelector('.nav-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
    
    // Aggiungi nuovo badge se ci sono non lette
    if (count > 0) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.textContent = count > 99 ? '99+' : count;
      navItem.appendChild(badge);
    }
  },

  /**
   * Aggiorna le statistiche nell'header
   */
  updateStats() {
    const totale = this.comunicazioni.length;
    const nonLette = this.countNonLette();
    const lette = totale - nonLette;
    
    const statTotale = document.getElementById('stat-com-totale');
    const statNonLette = document.getElementById('stat-com-nonlette');
    const statNonLetteCard = document.getElementById('stat-com-nonlette-card');
    const statLette = document.getElementById('stat-com-lette');
    
    if (statTotale) statTotale.textContent = totale;
    if (statNonLette) statNonLette.textContent = nonLette;
    if (statNonLetteCard) statNonLetteCard.textContent = nonLette;
    if (statLette) statLette.textContent = lette;
  },

  /**
   * Verifica se l'utente è admin
   */
  isAdmin() {
    return AuthManager.isAdmin();
  },

  /**
   * Renderizza la struttura HTML del modulo
   */
  render() {
    const container = document.getElementById('module-container');
    if (!container) return;

    const user = AuthManager.getCurrentUser();
    const isAdmin = this.isAdmin();

    container.innerHTML = `
      <div class="comunicazioni-module">
        
        <!-- Header -->
        <div class="comunicazioni-header">
          <div class="comunicazioni-header-left">
            <h2 class="comunicazioni-title">📢 Comunicazioni Aziendali</h2>
            <p class="comunicazioni-subtitle">Comunicazioni ufficiali per tutto il team</p>
          </div>
          
          <div class="comunicazioni-header-right">
            <!-- Badge non lette -->
            <div class="com-badge-nonlette" id="badge-nonlette-container">
              <span class="com-badge-icon">📬</span>
              <span id="stat-com-nonlette">0</span> non lette
            </div>
            
            ${isAdmin ? `
              <button class="btn btn-primary" id="btn-nuova-comunicazione">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuova Comunicazione
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Stats Cards -->
        <div class="comunicazioni-stats">
          <div class="com-stat-card">
            <div class="com-stat-number" id="stat-com-totale">0</div>
            <div class="com-stat-label">Totali</div>
          </div>
          <div class="com-stat-card com-stat-warning">
            <div class="com-stat-number" id="stat-com-nonlette-card">0</div>
            <div class="com-stat-label">Da leggere</div>
          </div>
          <div class="com-stat-card com-stat-success">
            <div class="com-stat-number" id="stat-com-lette">0</div>
            <div class="com-stat-label">Già lette</div>
          </div>
        </div>

        <!-- Lista Comunicazioni -->
        <div class="comunicazioni-list-container">
          <div class="comunicazioni-list" id="comunicazioni-list">
            <div class="loading-state">
              <div class="loading-spinner"></div>
              <p>Caricamento comunicazioni...</p>
            </div>
          </div>
        </div>

      </div>

      <!-- Modal Dettaglio Comunicazione -->
      <div class="modal-overlay" id="modal-dettaglio-com">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <div class="modal-header-left">
              <h2 id="modal-com-oggetto">Oggetto</h2>
            </div>
            <button class="modal-close" id="btn-close-dettaglio">&times;</button>
          </div>
          <div class="modal-body">
            <div class="com-dettaglio-meta" id="modal-com-meta"></div>
            <div class="com-dettaglio-testo" id="modal-com-testo"></div>
          </div>
          <div class="modal-footer">
            <div class="com-stato-lettura" id="modal-com-stato"></div>
            <div class="modal-footer-actions">
              ${isAdmin ? `
                <button class="btn btn-secondary" id="btn-modifica-com">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                  </svg>
                  Modifica
                </button>
                <button class="btn btn-danger" id="btn-elimina-com">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Elimina
                </button>
              ` : ''}
              <button class="btn btn-primary" id="btn-chiudi-dettaglio">Chiudi</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Nuova/Modifica Comunicazione (solo Admin) -->
      ${isAdmin ? `
        <div class="modal-overlay" id="modal-form-com">
          <div class="modal-container">
            <div class="modal-header">
              <h2 id="modal-form-title">Nuova Comunicazione</h2>
              <button class="modal-close" id="btn-close-form">&times;</button>
            </div>
            <div class="modal-body">
              <form id="form-comunicazione">
                <input type="hidden" id="form-com-id" value="">
                
                <div class="form-group">
                  <label class="form-label" for="form-com-oggetto">Oggetto *</label>
                  <input type="text" class="form-input" id="form-com-oggetto" 
                         placeholder="Es: Aggiornamento importante" required>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="form-com-priorita">Priorità</label>
                  <select class="form-input" id="form-com-priorita">
                    <option value="Bassa">🟢 Bassa</option>
                    <option value="Media" selected>🟡 Media</option>
                    <option value="Alta">🔴 Alta</option>
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label" for="form-com-testo">Testo della comunicazione *</label>
                  <textarea class="form-input form-textarea" id="form-com-testo" rows="6"
                            placeholder="Scrivi qui il contenuto della comunicazione..." required></textarea>
                </div>
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" id="btn-annulla-form">Annulla</button>
              <button type="submit" form="form-comunicazione" class="btn btn-primary" id="btn-salva-com">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Pubblica
              </button>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- Modal Conferma Eliminazione -->
      ${isAdmin ? `
        <div class="modal-overlay" id="modal-conferma-elimina">
          <div class="modal-container modal-sm">
            <div class="modal-header">
              <h2>Conferma Eliminazione</h2>
              <button class="modal-close" id="btn-close-conferma">&times;</button>
            </div>
            <div class="modal-body text-center">
              <div class="confirm-icon danger">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <p>Sei sicuro di voler eliminare questa comunicazione?</p>
              <p class="text-muted">Questa azione non può essere annullata.</p>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="btn-annulla-elimina">Annulla</button>
              <button class="btn btn-danger" id="btn-conferma-elimina">Elimina</button>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  },

  /**
   * Associa gli eventi
   */
  bindEvents() {
    const isAdmin = this.isAdmin();

    // Bottone nuova comunicazione (solo Admin)
    if (isAdmin) {
      const btnNuova = document.getElementById('btn-nuova-comunicazione');
      if (btnNuova) {
        btnNuova.addEventListener('click', () => this.openFormModal());
      }

      // Form submit
      const form = document.getElementById('form-comunicazione');
      if (form) {
        form.addEventListener('submit', (e) => this.handleFormSubmit(e));
      }

      // Chiudi form modal
      const btnCloseForm = document.getElementById('btn-close-form');
      const btnAnnullaForm = document.getElementById('btn-annulla-form');
      if (btnCloseForm) btnCloseForm.addEventListener('click', () => this.closeFormModal());
      if (btnAnnullaForm) btnAnnullaForm.addEventListener('click', () => this.closeFormModal());

      // Modifica comunicazione
      const btnModifica = document.getElementById('btn-modifica-com');
      if (btnModifica) {
        btnModifica.addEventListener('click', () => this.editComunicazione());
      }

      // Elimina comunicazione
      const btnElimina = document.getElementById('btn-elimina-com');
      if (btnElimina) {
        btnElimina.addEventListener('click', () => this.openDeleteConfirm());
      }

      // Modal conferma eliminazione
      const btnCloseConferma = document.getElementById('btn-close-conferma');
      const btnAnnullaElimina = document.getElementById('btn-annulla-elimina');
      const btnConfermaElimina = document.getElementById('btn-conferma-elimina');
      if (btnCloseConferma) btnCloseConferma.addEventListener('click', () => this.closeDeleteConfirm());
      if (btnAnnullaElimina) btnAnnullaElimina.addEventListener('click', () => this.closeDeleteConfirm());
      if (btnConfermaElimina) btnConfermaElimina.addEventListener('click', () => this.deleteComunicazione());
    }

    // Chiudi dettaglio modal
    const btnCloseDettaglio = document.getElementById('btn-close-dettaglio');
    const btnChiudiDettaglio = document.getElementById('btn-chiudi-dettaglio');
    if (btnCloseDettaglio) btnCloseDettaglio.addEventListener('click', () => this.closeDettaglioModal());
    if (btnChiudiDettaglio) btnChiudiDettaglio.addEventListener('click', () => this.closeDettaglioModal());

    // Click fuori modal per chiudere
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });
  },

  /**
   * Renderizza la lista delle comunicazioni
   */
  renderList() {
    const container = document.getElementById('comunicazioni-list');
    if (!container) return;

    if (this.comunicazioni.length === 0) {
      container.innerHTML = `
        <div class="comunicazioni-empty">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
          </svg>
          <h3>Nessuna comunicazione</h3>
          <p>Non ci sono ancora comunicazioni pubblicate.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.comunicazioni.map(com => {
      const isLetta = this.letteIds.has(com.id);
      const dataCreazione = com.dataCreazione?.toDate ? 
        this.formatData(com.dataCreazione.toDate()) : 'N/D';
      
      return `
        <div class="comunicazione-item ${isLetta ? 'letta' : 'non-letta'}" 
             data-id="${com.id}">
          
          <!-- Indicatore non letto -->
          <div class="com-indicator">
            ${!isLetta ? '<div class="com-dot"></div>' : ''}
          </div>
          
          <!-- Contenuto -->
          <div class="com-content">
            <div class="com-header">
              <h3 class="com-oggetto">${this.escapeHtml(com.oggetto || 'Senza oggetto')}</h3>
              ${this.renderPriorityBadge(com.priorita)}
            </div>
            <p class="com-preview">${this.escapeHtml(this.truncate(com.testo, 150))}</p>
          </div>
          
          <!-- Meta -->
          <div class="com-meta">
            <div class="com-data">${dataCreazione}</div>
            <div class="com-autore">da ${this.escapeHtml(com.autoreNome || 'Admin')}</div>
          </div>
          
          <!-- Freccia -->
          <div class="com-arrow">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </div>
        </div>
      `;
    }).join('');

    // Aggiungi click handler per ogni comunicazione
    container.querySelectorAll('.comunicazione-item').forEach(item => {
      item.addEventListener('click', () => {
        const id = item.dataset.id;
        this.openDettaglio(id);
      });
    });
  },

  /**
   * Renderizza il badge priorità
   */
  renderPriorityBadge(priorita) {
    const classes = {
      'Alta': 'badge-danger',
      'Media': 'badge-warning',
      'Bassa': 'badge-success'
    };
    const badgeClass = classes[priorita] || 'badge-warning';
    return `<span class="badge ${badgeClass}">${priorita || 'Media'}</span>`;
  },

  /**
   * Apre il modal dettaglio
   */
  openDettaglio(id) {
    const com = this.comunicazioni.find(c => c.id === id);
    if (!com) return;

    this.currentComId = id;

    // Popola il modal
    document.getElementById('modal-com-oggetto').textContent = com.oggetto || 'Senza oggetto';
    
    const dataCreazione = com.dataCreazione?.toDate ? 
      this.formatDataFull(com.dataCreazione.toDate()) : 'N/D';
    
    document.getElementById('modal-com-meta').innerHTML = `
      <div class="com-meta-row">
        ${this.renderPriorityBadge(com.priorita)}
        <span class="com-meta-separator">•</span>
        <span>Pubblicata il ${dataCreazione}</span>
        <span class="com-meta-separator">•</span>
        <span>da ${this.escapeHtml(com.autoreNome || 'Admin')}</span>
      </div>
    `;
    
    document.getElementById('modal-com-testo').innerHTML = `
      <p>${this.escapeHtml(com.testo || '').replace(/\n/g, '<br>')}</p>
    `;

    // Stato lettura
    const isLetta = this.letteIds.has(id);
    document.getElementById('modal-com-stato').innerHTML = isLetta ? 
      '<span class="stato-letta">✓ Già letta</span>' : 
      '<span class="stato-nonletta">● Non letta</span>';

    // Segna come letta
    if (!isLetta) {
      this.segnaComeLetta(id);
    }

    // Mostra modal con .active
    document.getElementById('modal-dettaglio-com').classList.add('active');
  },

  /**
   * Chiude il modal dettaglio
   */
  closeDettaglioModal() {
    document.getElementById('modal-dettaglio-com').classList.remove('active');
    this.currentComId = null;
  },

  /**
   * Segna una comunicazione come letta
   */
  segnaComeLetta(id) {
    this.letteIds.add(id);
    this.saveLetteToStorage();
    this.renderList();
    this.updateBadge();
    this.updateStats();

    // Aggiorna stato nel modal
    const statoEl = document.getElementById('modal-com-stato');
    if (statoEl) {
      statoEl.innerHTML = '<span class="stato-letta">✓ Già letta</span>';
    }
  },

  /**
   * Apre il modal form (nuova o modifica)
   */
  openFormModal(comunicazione = null) {
    const modal = document.getElementById('modal-form-com');
    if (!modal) return;

    const title = document.getElementById('modal-form-title');
    const btnSalva = document.getElementById('btn-salva-com');

    if (comunicazione) {
      // Modifica
      title.textContent = 'Modifica Comunicazione';
      btnSalva.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
        Salva Modifiche
      `;
      
      document.getElementById('form-com-id').value = comunicazione.id;
      document.getElementById('form-com-oggetto').value = comunicazione.oggetto || '';
      document.getElementById('form-com-priorita').value = comunicazione.priorita || 'Media';
      document.getElementById('form-com-testo').value = comunicazione.testo || '';
    } else {
      // Nuova
      title.textContent = 'Nuova Comunicazione';
      btnSalva.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
        </svg>
        Pubblica
      `;
      
      document.getElementById('form-com-id').value = '';
      document.getElementById('form-com-oggetto').value = '';
      document.getElementById('form-com-priorita').value = 'Media';
      document.getElementById('form-com-testo').value = '';
    }

    // Mostra modal con .active
    modal.classList.add('active');
  },

  /**
   * Chiude il modal form
   */
  closeFormModal() {
    const modal = document.getElementById('modal-form-com');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Gestisce il submit del form
   */
  async handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('form-com-id').value;
    const oggetto = document.getElementById('form-com-oggetto').value.trim();
    const priorita = document.getElementById('form-com-priorita').value;
    const testo = document.getElementById('form-com-testo').value.trim();

    if (!oggetto || !testo) {
      App.showToast('Compila tutti i campi obbligatori', 'error');
      return;
    }

    const user = AuthManager.getCurrentUser();
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Errore di connessione', 'error');
      return;
    }

    try {
      const btnSalva = document.getElementById('btn-salva-com');
      btnSalva.disabled = true;
      btnSalva.textContent = 'Salvataggio...';

      if (id) {
        // Modifica
        await db.collection('comunicazioni').doc(id).update({
          oggetto,
          priorita,
          testo,
          dataModifica: firebase.firestore.FieldValue.serverTimestamp(),
          modificatoDa: user.id,
          modificatoDaNome: `${user.nome} ${user.cognome}`
        });
        App.showToast('Comunicazione aggiornata!', 'success');
      } else {
        // Nuova
        await db.collection('comunicazioni').add({
          oggetto,
          priorita,
          testo,
          dataCreazione: firebase.firestore.FieldValue.serverTimestamp(),
          autoreId: user.id,
          autoreNome: `${user.nome} ${user.cognome}`
        });
        App.showToast('Comunicazione pubblicata!', 'success');
      }

      this.closeFormModal();
      
    } catch (error) {
      console.error('Errore salvataggio:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    } finally {
      const btnSalva = document.getElementById('btn-salva-com');
      if (btnSalva) {
        btnSalva.disabled = false;
      }
    }
  },

  /**
   * Apre il form per modificare la comunicazione corrente
   */
  editComunicazione() {
    if (!this.currentComId) return;
    
    const com = this.comunicazioni.find(c => c.id === this.currentComId);
    if (!com) return;

    this.closeDettaglioModal();
    this.openFormModal(com);
  },

  /**
   * Apre il modal di conferma eliminazione
   */
  openDeleteConfirm() {
    const modal = document.getElementById('modal-conferma-elimina');
    if (modal) {
      modal.classList.add('active');
    }
  },

  /**
   * Chiude il modal di conferma eliminazione
   */
  closeDeleteConfirm() {
    const modal = document.getElementById('modal-conferma-elimina');
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Elimina la comunicazione corrente
   */
  async deleteComunicazione() {
    if (!this.currentComId) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Errore di connessione', 'error');
      return;
    }

    try {
      const btnConferma = document.getElementById('btn-conferma-elimina');
      if (btnConferma) {
        btnConferma.disabled = true;
        btnConferma.textContent = 'Eliminazione...';
      }

      await db.collection('comunicazioni').doc(this.currentComId).delete();
      
      // Rimuovi anche dalla lista lette
      this.letteIds.delete(this.currentComId);
      this.saveLetteToStorage();

      App.showToast('Comunicazione eliminata!', 'success');
      
      this.closeDeleteConfirm();
      this.closeDettaglioModal();
      
    } catch (error) {
      console.error('Errore eliminazione:', error);
      App.showToast('Errore durante l\'eliminazione', 'error');
    } finally {
      const btnConferma = document.getElementById('btn-conferma-elimina');
      if (btnConferma) {
        btnConferma.disabled = false;
        btnConferma.textContent = 'Elimina';
      }
    }
  },

  /**
   * Mostra errore
   */
  showError(message) {
    const container = document.getElementById('comunicazioni-list');
    if (!container) return;

    container.innerHTML = `
      <div class="comunicazioni-empty comunicazioni-error">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.303a9.97 9.97 0 01-2.929 7.07 9.97 9.97 0 01-7.07 2.93 9.97 9.97 0 01-7.072-2.93 9.97 9.97 0 01-2.928-7.07 9.97 9.97 0 012.929-7.07A9.97 9.97 0 0112 2.25a9.97 9.97 0 017.071 2.93 9.97 9.97 0 012.929 7.07z" />
        </svg>
        <h3>Errore di connessione</h3>
        <p>${message}</p>
      </div>
    `;
  },

  // ========== UTILITY FUNCTIONS ==========

  /**
   * Formatta la data breve
   */
  formatData(date) {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  },

  /**
   * Formatta la data completa
   */
  formatDataFull(date) {
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Tronca il testo
   */
  truncate(text, maxLength) {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  },

  /**
   * Escape HTML per prevenire XSS
   */
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Export globale
window.ComunicazioniModule = ComunicazioniModule;
