// CRM Strategica - Modulo Messaggi v1.0
// ======================================
// Gestisce Template WhatsApp (Solo Admin)

const MessaggiModule = {
  
  // Riferimenti
  container: null,
  unsubscribers: [],
  
  // Dati
  templates: [],
  templateCorrente: null,

  /**
   * Inizializza il modulo
   */
  async init() {
    console.log('📝 Messaggi - Inizializzazione...');
    
    this.container = document.getElementById('module-container');
    if (!this.container) return;
    
    // Verifica permessi - Solo Admin può accedere
    const user = AuthManager.getCurrentUser();
    if (!user || user.ruolo !== 'admin') {
      this.renderAccessDenied();
      return;
    }
    
    // Render e setup
    this.render();
    this.setupEventListeners();
    this.loadTemplates();
    
    console.log('✅ Messaggi - Pronto!');
  },

  /**
   * Cleanup
   */
  cleanup() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.unsubscribers = [];
    this.templateCorrente = null;
    console.log('🧹 Messaggi - Cleanup completato');
  },

  /**
   * Mostra pagina accesso negato
   */
  renderAccessDenied() {
    this.container.innerHTML = `
      <div class="access-denied">
        <div class="access-denied-icon">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <h2 class="access-denied-title">Accesso Riservato</h2>
        <p class="access-denied-text">Solo gli Amministratori possono gestire i Template WhatsApp</p>
      </div>
    `;
  },

  /**
   * Renderizza HTML principale
   */
  render() {
    this.container.innerHTML = `
      <div class="messaggi-module">
        
        <!-- Header -->
        <div class="messaggi-header">
          <div class="messaggi-header-left">
            <h2 class="messaggi-title">Template WhatsApp</h2>
            <p class="messaggi-subtitle">Gestisci i template che i commerciali useranno dal modulo Clienti</p>
          </div>
          <button id="btn-nuovo-template" class="btn btn-primary">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:20px;height:20px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Nuovo Template
          </button>
        </div>
        
        <!-- Stats -->
        <div class="messaggi-stats">
          <div class="stat-mini">
            <span class="stat-mini-number" id="stat-totali">0</span>
            <span class="stat-mini-label">Totali</span>
          </div>
          <div class="stat-mini stat-mini-success">
            <span class="stat-mini-number" id="stat-attivi">0</span>
            <span class="stat-mini-label">Attivi</span>
          </div>
          <div class="stat-mini stat-mini-warning">
            <span class="stat-mini-number" id="stat-disattivi">0</span>
            <span class="stat-mini-label">Disattivi</span>
          </div>
        </div>
        
        <!-- Lista Template -->
        <div class="templates-list" id="templates-list">
          <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Caricamento template...</p>
          </div>
        </div>
        
        <!-- Empty State -->
        <div id="templates-empty" class="templates-empty" style="display: none;">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
          </svg>
          <h3>Nessun template creato</h3>
          <p>Crea il tuo primo template WhatsApp</p>
          <button id="btn-nuovo-template-empty" class="btn btn-primary" style="margin-top: 1rem;">
            Crea Template
          </button>
        </div>
        
        <!-- Info Placeholder -->
        <div class="placeholder-info">
          <h4>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
            Placeholder Disponibili
          </h4>
          <p>Usa questi codici nel testo. Verranno sostituiti con i dati del cliente:</p>
          <div class="placeholder-tags">
            <code>{nome}</code>
            <code>{cognome}</code>
            <code>{azienda}</code>
            <code>{email}</code>
            <code>{telefono}</code>
          </div>
        </div>
      </div>
      
      <!-- Modal Nuovo/Modifica Template -->
      ${this.renderModalTemplate()}
      
      <!-- Modal Elimina -->
      ${this.renderModalElimina()}
    `;
  },

  /**
   * Modal Nuovo/Modifica Template
   */
  renderModalTemplate() {
    return `
      <div id="modal-template" class="modal-overlay" style="display: none;">
        <div class="modal-container">
          <div class="modal-header">
            <h2 id="modal-template-title">Nuovo Template</h2>
            <button class="modal-close" data-close-modal="modal-template">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <form id="form-template" class="modal-body">
            <input type="hidden" id="template-id">
            
            <div class="form-group">
              <label class="form-label">Nome Template *</label>
              <input 
                type="text" 
                id="template-nome" 
                class="form-input" 
                placeholder="Es: Benvenuto, Richiesta Documenti..."
                required
              >
              <small class="form-hint">Un nome breve per identificare il template</small>
            </div>
            
            <div class="form-group">
              <label class="form-label">Testo Messaggio *</label>
              <textarea 
                id="template-testo" 
                class="form-input form-textarea" 
                rows="5" 
                placeholder="Gentile {nome}, ..."
                required
              ></textarea>
              <small class="form-hint">Usa {nome}, {cognome}, {azienda} per inserire dati automatici</small>
            </div>
            
            <div class="form-group">
              <label class="form-label">Anteprima</label>
              <div id="template-anteprima" class="template-anteprima">
                <p class="anteprima-placeholder">L'anteprima apparirà qui mentre scrivi...</p>
              </div>
            </div>
            
            <div class="form-group form-group-inline">
              <label class="checkbox-label">
                <input type="checkbox" id="template-attivo" checked>
                <span class="checkbox-custom"></span>
                Template attivo (visibile ai commerciali)
              </label>
            </div>
          </form>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-template">Annulla</button>
            <button type="submit" form="form-template" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Salva Template
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Elimina
   */
  renderModalElimina() {
    return `
      <div id="modal-elimina-template" class="modal-overlay" style="display: none;">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2>Conferma Eliminazione</h2>
            <button class="modal-close" data-close-modal="modal-elimina-template">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <p>Sei sicuro di voler eliminare il template "<strong id="elimina-template-nome"></strong>"?</p>
            <p class="text-muted">Questa azione non può essere annullata.</p>
            <input type="hidden" id="elimina-template-id">
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-elimina-template">Annulla</button>
            <button type="button" id="btn-conferma-elimina-template" class="btn btn-danger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:18px;height:18px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
              Elimina
            </button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Setup Event Listeners
   */
  setupEventListeners() {
    // Nuovo template
    document.getElementById('btn-nuovo-template')?.addEventListener('click', () => this.openModalNuovo());
    document.getElementById('btn-nuovo-template-empty')?.addEventListener('click', () => this.openModalNuovo());

    // Form template submit
    document.getElementById('form-template')?.addEventListener('submit', (e) => this.handleSaveTemplate(e));

    // Anteprima live
    document.getElementById('template-testo')?.addEventListener('input', (e) => this.updateAnteprima(e.target.value));

    // Chiudi modals
    document.querySelectorAll('[data-close-modal]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const modalId = e.currentTarget.dataset.closeModal;
        this.closeModal(modalId);
      });
    });

    // Click su overlay per chiudere
    document.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
      });
    });

    // Conferma eliminazione
    document.getElementById('btn-conferma-elimina-template')?.addEventListener('click', () => this.handleEliminaTemplate());

    // Azioni template (delegation)
    document.getElementById('templates-list')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const templateId = btn.dataset.id;

      switch (action) {
        case 'edit': this.openModalModifica(templateId); break;
        case 'toggle': this.toggleAttivo(templateId); break;
        case 'delete': this.openModalElimina(templateId); break;
      }
    });
  },

  /**
   * Carica templates da Firebase
   */
  loadTemplates() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      console.error('Database non disponibile');
      return;
    }

    const unsubscribe = db.collection('templateWhatsapp')
      .orderBy('ordine', 'asc')
      .onSnapshot(
        (snapshot) => {
          this.templates = [];
          snapshot.forEach(doc => {
            this.templates.push({ id: doc.id, ...doc.data() });
          });
          this.renderTemplates();
          this.updateStats();
        },
        (error) => {
          console.error('Errore caricamento templates:', error);
          App.showToast('Errore nel caricamento templates', 'error');
        }
      );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Render lista templates
   */
  renderTemplates() {
    const listContainer = document.getElementById('templates-list');
    const emptyState = document.getElementById('templates-empty');
    
    if (!listContainer) return;

    if (this.templates.length === 0) {
      listContainer.style.display = 'none';
      if (emptyState) emptyState.style.display = 'flex';
      return;
    }

    listContainer.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    listContainer.innerHTML = this.templates.map(tmpl => `
      <div class="template-card ${tmpl.attivo ? '' : 'template-card-disabled'}">
        <div class="template-card-content">
          <div class="template-card-header">
            <div class="template-icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </div>
            <h4 class="template-nome">${this.escapeHtml(tmpl.nome)}</h4>
            <span class="badge ${tmpl.attivo ? 'badge-success' : 'badge-warning'}">
              ${tmpl.attivo ? '✓ Attivo' : '○ Disattivo'}
            </span>
          </div>
          <p class="template-testo">${this.escapeHtml(tmpl.testo)}</p>
        </div>
        <div class="template-card-actions">
          <button class="btn btn-secondary btn-sm" data-action="edit" data-id="${tmpl.id}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Modifica
          </button>
          <button class="btn ${tmpl.attivo ? 'btn-warning' : 'btn-success'} btn-sm" data-action="toggle" data-id="${tmpl.id}">
            ${tmpl.attivo ? '⏸️ Disattiva' : '▶️ Attiva'}
          </button>
          <button class="btn btn-danger btn-sm" data-action="delete" data-id="${tmpl.id}">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Aggiorna statistiche
   */
  updateStats() {
    const totali = this.templates.length;
    const attivi = this.templates.filter(t => t.attivo).length;
    const disattivi = totali - attivi;

    document.getElementById('stat-totali').textContent = totali;
    document.getElementById('stat-attivi').textContent = attivi;
    document.getElementById('stat-disattivi').textContent = disattivi;
  },

  /**
   * Aggiorna anteprima
   */
  updateAnteprima(testo) {
    const anteprimaEl = document.getElementById('template-anteprima');
    if (!anteprimaEl) return;

    if (!testo.trim()) {
      anteprimaEl.innerHTML = '<p class="anteprima-placeholder">L\'anteprima apparirà qui mentre scrivi...</p>';
      return;
    }

    // Sostituisci placeholder con esempi
    const testoAnteprima = testo
      .replace(/\{nome\}/g, '<span class="placeholder-highlight">Mario</span>')
      .replace(/\{cognome\}/g, '<span class="placeholder-highlight">Rossi</span>')
      .replace(/\{azienda\}/g, '<span class="placeholder-highlight">Rossi SRL</span>')
      .replace(/\{email\}/g, '<span class="placeholder-highlight">mario@email.it</span>')
      .replace(/\{telefono\}/g, '<span class="placeholder-highlight">333 1234567</span>');

    anteprimaEl.innerHTML = `<p>${testoAnteprima}</p>`;
  },

  /**
   * Apri modal nuovo template
   */
  openModalNuovo() {
    const form = document.getElementById('form-template');
    form.reset();
    document.getElementById('template-id').value = '';
    document.getElementById('template-attivo').checked = true;
    document.getElementById('modal-template-title').textContent = 'Nuovo Template';
    this.updateAnteprima('');
    document.getElementById('modal-template').style.display = 'flex';
  },

  /**
   * Apri modal modifica template
   */
  openModalModifica(templateId) {
    const tmpl = this.templates.find(t => t.id === templateId);
    if (!tmpl) return;

    document.getElementById('modal-template-title').textContent = 'Modifica Template';
    document.getElementById('template-id').value = tmpl.id;
    document.getElementById('template-nome').value = tmpl.nome || '';
    document.getElementById('template-testo').value = tmpl.testo || '';
    document.getElementById('template-attivo').checked = tmpl.attivo !== false;
    
    this.updateAnteprima(tmpl.testo || '');
    
    document.getElementById('modal-template').style.display = 'flex';
  },

  /**
   * Apri modal elimina
   */
  openModalElimina(templateId) {
    const tmpl = this.templates.find(t => t.id === templateId);
    if (!tmpl) return;

    document.getElementById('elimina-template-id').value = templateId;
    document.getElementById('elimina-template-nome').textContent = tmpl.nome;
    document.getElementById('modal-elimina-template').style.display = 'flex';
  },

  /**
   * Salva template
   */
  async handleSaveTemplate(e) {
    e.preventDefault();

    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Database non disponibile', 'error');
      return;
    }

    const user = AuthManager.getCurrentUser();
    const templateId = document.getElementById('template-id').value;
    const isEdit = !!templateId;

    const templateData = {
      nome: document.getElementById('template-nome').value.trim(),
      testo: document.getElementById('template-testo').value.trim(),
      attivo: document.getElementById('template-attivo').checked,
      dataModifica: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Validazione
    if (!templateData.nome || !templateData.testo) {
      App.showToast('Compila tutti i campi obbligatori', 'warning');
      return;
    }

    try {
      if (isEdit) {
        await db.collection('templateWhatsapp').doc(templateId).update(templateData);
        App.showToast('Template aggiornato', 'success');
      } else {
        // Nuovo template
        templateData.dataCreazione = firebase.firestore.FieldValue.serverTimestamp();
        templateData.creatoDa = user.id;
        templateData.ordine = this.templates.length + 1;
        
        await db.collection('templateWhatsapp').add(templateData);
        App.showToast('Template creato', 'success');
      }

      this.closeModal('modal-template');

    } catch (error) {
      console.error('Errore salvataggio template:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  /**
   * Toggle attivo/disattivo
   */
  async toggleAttivo(templateId) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const tmpl = this.templates.find(t => t.id === templateId);
    if (!tmpl) return;

    try {
      await db.collection('templateWhatsapp').doc(templateId).update({
        attivo: !tmpl.attivo,
        dataModifica: firebase.firestore.FieldValue.serverTimestamp()
      });

      App.showToast(tmpl.attivo ? 'Template disattivato' : 'Template attivato', 'success');

    } catch (error) {
      console.error('Errore toggle template:', error);
      App.showToast('Errore durante l\'operazione', 'error');
    }
  },

  /**
   * Elimina template
   */
  async handleEliminaTemplate() {
    const templateId = document.getElementById('elimina-template-id').value;
    if (!templateId) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('templateWhatsapp').doc(templateId).delete();
      App.showToast('Template eliminato', 'success');
      this.closeModal('modal-elimina-template');

    } catch (error) {
      console.error('Errore eliminazione template:', error);
      App.showToast('Errore durante l\'eliminazione', 'error');
    }
  },

  /**
   * Chiudi modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.style.display = 'none';
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

// ============================================
// FUNZIONE HELPER per usare i template da Clienti
// ============================================

/**
 * Carica i template WhatsApp attivi da Firebase
 * Da usare nel modulo Clienti
 * @returns {Promise<Array>}
 */
async function loadTemplatesWhatsApp() {
  const db = window.FirebaseConfig.getDb();
  if (!db) return [];

  try {
    const snapshot = await db.collection('templateWhatsapp')
      .where('attivo', '==', true)
      .orderBy('ordine', 'asc')
      .get();

    const templates = [];
    snapshot.forEach(doc => {
      templates.push({ id: doc.id, ...doc.data() });
    });
    return templates;

  } catch (error) {
    console.error('Errore caricamento templates:', error);
    return [];
  }
}

/**
 * Applica placeholder al testo del template
 * @param {string} testo - Testo con placeholder
 * @param {object} cliente - Dati cliente
 * @returns {string}
 */
function applicaPlaceholder(testo, cliente) {
  if (!testo || !cliente) return testo;
  
  return testo
    .replace(/\{nome\}/g, cliente.nome || '')
    .replace(/\{cognome\}/g, cliente.cognome || '')
    .replace(/\{azienda\}/g, cliente.azienda || '')
    .replace(/\{email\}/g, cliente.email || '')
    .replace(/\{telefono\}/g, cliente.telefono || '');
}

// Export globale
window.MessaggiModule = MessaggiModule;
window.loadTemplatesWhatsApp = loadTemplatesWhatsApp;
window.applicaPlaceholder = applicaPlaceholder;
