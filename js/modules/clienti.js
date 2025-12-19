// CRM Strategica - Modulo Clienti v2.0
// =====================================
// Gestisce clienti con anagrafica estesa, note, storico, documenti

const ClientiModule = {
  
  // Riferimenti
  container: null,
  unsubscribers: [],
  
  // Dati
  clienti: [],
  consulenti: [],
  statiPratica: [],
  clienteCorrente: null,
  
  // Filtri
  filtri: {
    ricerca: '',
    stato: '',
    consulente: ''
  },

  /**
   * Inizializza il modulo
   */
  async init() {
    console.log('👥 Clienti - Inizializzazione...');
    
    this.container = document.getElementById('module-container');
    if (!this.container) return;
    
    // Carica stati da Impostazioni (o usa default)
    await this.loadStatiPratica();
    
    // Carica consulenti
    await this.loadConsulenti();
    
    // Render e setup
    this.render();
    this.setupEventListeners();
    this.loadClienti();
    
    console.log('✅ Clienti - Pronto!');
  },

  /**
   * Cleanup
   */
  cleanup() {
    this.unsubscribers.forEach(unsub => {
      if (typeof unsub === 'function') unsub();
    });
    this.unsubscribers = [];
    this.clienteCorrente = null;
    console.log('🧹 Clienti - Cleanup completato');
  },

  /**
   * Carica stati pratica da Impostazioni o usa default
   */
  async loadStatiPratica() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      this.statiPratica = this.getDefaultStati();
      return;
    }

    try {
      const doc = await db.collection('impostazioni').doc('stati_pratica').get();
      if (doc.exists && doc.data().stati) {
        this.statiPratica = doc.data().stati;
      } else {
        this.statiPratica = this.getDefaultStati();
      }
    } catch (error) {
      console.log('Stati pratica: uso default');
      this.statiPratica = this.getDefaultStati();
    }
  },

  /**
   * Stati di default
   */
  getDefaultStati() {
    return [
      { id: 'nuovo', label: 'Nuovo Lead', color: 'primary', ordine: 1 },
      { id: 'contattato', label: 'Contattato', color: 'warning', ordine: 2 },
      { id: 'in_lavorazione', label: 'In Lavorazione', color: 'warning', ordine: 3 },
      { id: 'proposta_inviata', label: 'Proposta Inviata', color: 'secondary', ordine: 4 },
      { id: 'chiuso_vinto', label: 'Chiuso Vinto', color: 'success', ordine: 5 },
      { id: 'chiuso_perso', label: 'Chiuso Perso', color: 'danger', ordine: 6 }
    ];
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
        }
      });
    } catch (error) {
      console.error('Errore caricamento consulenti:', error);
    }
  },

  /**
   * Verifica permessi utente
   */
  canEditStato() {
    const user = AuthManager.getCurrentUser();
    return user?.ruolo === 'admin';
  },

  canEditCliente() {
    const user = AuthManager.getCurrentUser();
    return user?.ruolo === 'admin' || user?.ruolo === 'team_manager';
  },

  canUploadDocuments() {
    const user = AuthManager.getCurrentUser();
    return user?.ruolo === 'admin' || user?.ruolo === 'team_manager' || user?.ruolo === 'consulente';
  },

  /**
   * Renderizza HTML principale
   */
  render() {
    const user = AuthManager.getCurrentUser();
    const isAdmin = user?.ruolo === 'admin';
    const isTeamManager = user?.ruolo === 'team_manager';

    this.container.innerHTML = `
      <div class="clienti-module">
        
        <!-- Toolbar -->
        <div class="clienti-toolbar">
          <div class="toolbar-left">
            <div class="search-box">
              <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input type="text" id="clienti-search" class="search-input" placeholder="Cerca cliente...">
            </div>
            
            <select id="filtro-stato" class="filtro-select">
              <option value="">Tutti gli stati</option>
              ${this.statiPratica.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
            </select>
            
            ${isAdmin || isTeamManager ? `
              <select id="filtro-consulente" class="filtro-select">
                <option value="">Tutti i consulenti</option>
                ${this.consulenti.map(c => `<option value="${c.id}">${c.nome} ${c.cognome}</option>`).join('')}
              </select>
            ` : ''}
          </div>
          
          <div class="toolbar-right">
            <button id="btn-nuovo-cliente" class="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:20px;height:20px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Nuovo Cliente
            </button>
          </div>
        </div>
        
        <!-- Stats -->
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
        
        <!-- Tabella -->
        <div class="clienti-table-container">
          <table class="clienti-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contatti</th>
                <th>Azienda</th>
                <th>Stato</th>
                <th>Commerciale</th>
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
      
      <!-- MODALS -->
      ${this.renderModalNuovoCliente()}
      ${this.renderModalDettaglio()}
      ${this.renderModalWhatsApp()}
      ${this.renderModalAppuntamento()}
      ${this.renderModalElimina()}
    `;
  },

  /**
   * Modal Nuovo/Modifica Cliente
   */
  renderModalNuovoCliente() {
    const user = AuthManager.getCurrentUser();
    const isAdmin = user?.ruolo === 'admin';
    const isTeamManager = user?.ruolo === 'team_manager';

    return `
      <div id="modal-cliente" class="modal-overlay hidden">
        <div class="modal-container modal-lg">
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
            
            <h4 class="form-section-title">Dati Personali</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" id="cliente-nome" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Cognome *</label>
                <input type="text" id="cliente-cognome" class="form-input" required>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Email *</label>
                <input type="email" id="cliente-email" class="form-input" required>
              </div>
              <div class="form-group">
                <label class="form-label">Telefono *</label>
                <input type="tel" id="cliente-telefono" class="form-input" required>
              </div>
            </div>
            
            <h4 class="form-section-title">Dati Aziendali</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Azienda</label>
                <input type="text" id="cliente-azienda" class="form-input">
              </div>
              <div class="form-group">
                <label class="form-label">P.IVA / Codice Fiscale</label>
                <input type="text" id="cliente-piva" class="form-input">
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Indirizzo</label>
              <input type="text" id="cliente-indirizzo" class="form-input">
            </div>
            
            <h4 class="form-section-title">Assegnazione</h4>
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Stato Pratica</label>
                <select id="cliente-stato" class="form-input" ${!this.canEditStato() ? 'disabled' : ''}>
                  ${this.statiPratica.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
                </select>
                ${!this.canEditStato() ? '<small class="form-hint">Solo Admin può modificare lo stato</small>' : ''}
              </div>
              
              ${isAdmin || isTeamManager ? `
                <div class="form-group">
                  <label class="form-label">Assegna a Commerciale</label>
                  <select id="cliente-consulente" class="form-input">
                    <option value="">-- Seleziona --</option>
                    ${this.consulenti.map(c => `<option value="${c.id}">${c.nome} ${c.cognome}</option>`).join('')}
                  </select>
                </div>
              ` : ''}
            </div>
            
            <div class="form-group">
              <label class="form-label">Note iniziali</label>
              <textarea id="cliente-note" class="form-input form-textarea" rows="3"></textarea>
            </div>
          </form>
          
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-cliente">Annulla</button>
            <button type="submit" form="form-cliente" class="btn btn-primary">Salva Cliente</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Dettaglio Cliente (con tabs)
   */
  renderModalDettaglio() {
    return `
      <div id="modal-dettaglio" class="modal-overlay hidden">
        <div class="modal-container modal-xl">
          <div class="modal-header">
            <div class="modal-header-left">
              <h2 id="dettaglio-title">Dettaglio Cliente</h2>
              <span id="dettaglio-badge" class="badge badge-primary">Nuovo</span>
            </div>
            <button class="modal-close" data-close-modal="modal-dettaglio">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <!-- Header Azioni -->
          <div class="dettaglio-header">
            <div class="dettaglio-meta">
              <div class="meta-item" id="meta-commerciale">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
                <span><strong>Commerciale:</strong> <span id="val-commerciale">-</span></span>
              </div>
              <div class="meta-item" id="meta-teammanager">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
                <span><strong>Team Manager:</strong> <span id="val-teammanager">-</span></span>
              </div>
            </div>
            <div class="dettaglio-actions">
              <button id="btn-whatsapp" class="btn btn-whatsapp">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width:18px;height:18px">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                WhatsApp
              </button>
              <button id="btn-appuntamento" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                Appuntamento
              </button>
              <button id="btn-modifica-dettaglio" class="btn btn-secondary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
                Modifica
              </button>
            </div>
          </div>
          
          <!-- Tabs -->
          <div class="dettaglio-tabs">
            <button class="tab-btn active" data-tab="info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
              </svg>
              Informazioni
            </button>
            <button class="tab-btn" data-tab="stato">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Stato Pratica
            </button>
            <button class="tab-btn" data-tab="note">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              Note
            </button>
            <button class="tab-btn" data-tab="storico">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              Storico
            </button>
            <button class="tab-btn" data-tab="documenti">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
              </svg>
              Documenti
            </button>
          </div>
          
          <!-- Tab Content -->
          <div class="modal-body dettaglio-body">
            <div id="tab-info" class="tab-content active"></div>
            <div id="tab-stato" class="tab-content"></div>
            <div id="tab-note" class="tab-content"></div>
            <div id="tab-storico" class="tab-content"></div>
            <div id="tab-documenti" class="tab-content"></div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal WhatsApp Templates
   */
  renderModalWhatsApp() {
    return `
      <div id="modal-whatsapp" class="modal-overlay hidden">
        <div class="modal-container modal-sm">
          <div class="modal-header">
            <h2>
              <svg viewBox="0 0 24 24" fill="#25D366" style="width:24px;height:24px;margin-right:8px;vertical-align:middle">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Template WhatsApp
            </h2>
            <button class="modal-close" data-close-modal="modal-whatsapp">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div class="modal-body">
            <div id="whatsapp-templates" class="whatsapp-templates">
              <p class="text-muted">I template saranno configurabili dal modulo Messaggi</p>
              <div class="template-item" data-template="benvenuto">
                <strong>Benvenuto</strong>
                <p>Gentile Cliente, benvenuto in Strategica...</p>
              </div>
              <div class="template-item" data-template="documenti">
                <strong>Richiesta Documenti</strong>
                <p>Gentile Cliente, per procedere necessitiamo...</p>
              </div>
              <div class="template-item" data-template="appuntamento">
                <strong>Conferma Appuntamento</strong>
                <p>Le confermiamo l'appuntamento per...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Modal Appuntamento
   */
  renderModalAppuntamento() {
    return `
      <div id="modal-appuntamento" class="modal-overlay hidden">
        <div class="modal-container">
          <div class="modal-header">
            <h2>Fissa Appuntamento</h2>
            <button class="modal-close" data-close-modal="modal-appuntamento">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <form id="form-appuntamento" class="modal-body">
            <div class="form-group">
              <label class="form-label">Titolo *</label>
              <input type="text" id="app-titolo" class="form-input" required>
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
            <div class="form-group">
              <label class="form-label">Tipo</label>
              <select id="app-tipo" class="form-input">
                <option value="chiamata">Chiamata</option>
                <option value="videocall">Videocall</option>
                <option value="incontro">Incontro</option>
                <option value="sopralluogo">Sopralluogo</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Note</label>
              <textarea id="app-note" class="form-input form-textarea" rows="3"></textarea>
            </div>
          </form>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close-modal="modal-appuntamento">Annulla</button>
            <button type="submit" form="form-appuntamento" class="btn btn-primary">Salva Appuntamento</button>
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
            <button type="button" class="btn btn-secondary" data-close-modal="modal-elimina">Annulla</button>
            <button type="button" id="btn-conferma-elimina" class="btn btn-danger">Elimina</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Setup Event Listeners
   */
  setupEventListeners() {
    // Ricerca
    document.getElementById('clienti-search')?.addEventListener('input', (e) => {
      this.filtri.ricerca = e.target.value.toLowerCase();
      this.renderClienti();
    });

    // Filtro stato
    document.getElementById('filtro-stato')?.addEventListener('change', (e) => {
      this.filtri.stato = e.target.value;
      this.renderClienti();
    });

    // Filtro consulente
    document.getElementById('filtro-consulente')?.addEventListener('change', (e) => {
      this.filtri.consulente = e.target.value;
      this.renderClienti();
    });

    // Nuovo cliente
    document.getElementById('btn-nuovo-cliente')?.addEventListener('click', () => this.openModalNuovo());

    // Form cliente submit
    document.getElementById('form-cliente')?.addEventListener('submit', (e) => this.handleSaveCliente(e));

    // Form appuntamento submit
    document.getElementById('form-appuntamento')?.addEventListener('submit', (e) => this.handleSaveAppuntamento(e));

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
        if (e.target === modal) modal.classList.add('hidden');
      });
    });

    // Conferma eliminazione
    document.getElementById('btn-conferma-elimina')?.addEventListener('click', () => this.handleEliminaCliente());

    // Modifica da dettaglio
    document.getElementById('btn-modifica-dettaglio')?.addEventListener('click', () => {
      if (this.clienteCorrente) {
        this.closeModal('modal-dettaglio');
        this.openModalModifica(this.clienteCorrente.id);
      }
    });

    // WhatsApp button
    document.getElementById('btn-whatsapp')?.addEventListener('click', () => {
      document.getElementById('modal-whatsapp').classList.remove('hidden');
    });

    // Appuntamento button
    document.getElementById('btn-appuntamento')?.addEventListener('click', () => {
      this.openModalAppuntamento();
    });

    // Tabs nel dettaglio
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.dataset.tab;
        this.switchTab(tab);
      });
    });

    // WhatsApp templates
    document.querySelectorAll('.template-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const template = e.currentTarget.dataset.template;
        this.sendWhatsApp(template);
      });
    });

    // Azioni tabella (delegation)
    document.getElementById('clienti-tbody')?.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;

      const action = btn.dataset.action;
      const clienteId = btn.dataset.id;

      switch (action) {
        case 'view': this.openModalDettaglio(clienteId); break;
        case 'edit': this.openModalModifica(clienteId); break;
        case 'delete': this.openModalElimina(clienteId); break;
      }
    });
  },

  /**
   * Switch Tab
   */
  switchTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabId}`);
    });
  },

  /**
   * Carica clienti da Firebase
   */
  loadClienti() {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();
    if (!user) return;

    let query = db.collection('clienti');

    if (user.ruolo === 'consulente') {
      query = query.where('consulenteId', '==', user.id);
    } else if (user.ruolo === 'team_manager') {
      query = query.where('teamManagerId', '==', user.id);
    }

    const unsubscribe = query.orderBy('dataCreazione', 'desc').onSnapshot(
      (snapshot) => {
        this.clienti = [];
        snapshot.forEach(doc => {
          this.clienti.push({ id: doc.id, ...doc.data() });
        });
        this.renderClienti();
        this.updateStats();
      },
      (error) => {
        console.error('Errore caricamento clienti:', error);
        App.showToast('Errore nel caricamento clienti', 'error');
      }
    );

    this.unsubscribers.push(unsubscribe);
  },

  /**
   * Render tabella clienti
   */
  renderClienti() {
    const tbody = document.getElementById('clienti-tbody');
    const emptyState = document.getElementById('clienti-empty');
    if (!tbody) return;

    let clientiFiltrati = this.clienti.filter(c => {
      if (this.filtri.ricerca) {
        const search = this.filtri.ricerca;
        const match = 
          (c.nome?.toLowerCase() || '').includes(search) ||
          (c.cognome?.toLowerCase() || '').includes(search) ||
          (c.email?.toLowerCase() || '').includes(search) ||
          (c.azienda?.toLowerCase() || '').includes(search) ||
          (c.telefono || '').includes(search);
        if (!match) return false;
      }
      if (this.filtri.stato && c.stato !== this.filtri.stato) return false;
      if (this.filtri.consulente && c.consulenteId !== this.filtri.consulente) return false;
      return true;
    });

    if (clientiFiltrati.length === 0) {
      tbody.innerHTML = '';
      emptyState?.classList.remove('hidden');
      document.querySelector('.clienti-table-container')?.classList.add('hidden');
      return;
    }

    emptyState?.classList.add('hidden');
    document.querySelector('.clienti-table-container')?.classList.remove('hidden');

    tbody.innerHTML = clientiFiltrati.map(cliente => {
      const stato = this.statiPratica.find(s => s.id === cliente.stato) || this.statiPratica[0];
      const consulente = this.consulenti.find(c => c.id === cliente.consulenteId);
      const data = cliente.dataCreazione?.toDate?.() 
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
          <td><span class="badge badge-${stato.color}">${stato.label}</span></td>
          <td>${consulente ? `${consulente.nome} ${consulente.cognome}` : '-'}</td>
          <td>${data}</td>
          <td>
            <div class="table-actions">
              <button class="btn-icon" data-action="view" data-id="${cliente.id}" title="Visualizza">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
              ${this.canEditCliente() ? `
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
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Update Stats
   */
  updateStats() {
    const totale = this.clienti.length;
    const nuovi = this.clienti.filter(c => c.stato === 'nuovo').length;
    const lavorazione = this.clienti.filter(c => ['contattato', 'in_lavorazione', 'proposta_inviata'].includes(c.stato)).length;
    const vinti = this.clienti.filter(c => c.stato === 'chiuso_vinto').length;

    document.getElementById('stat-totale').textContent = totale;
    document.getElementById('stat-nuovi').textContent = nuovi;
    document.getElementById('stat-lavorazione').textContent = lavorazione;
    document.getElementById('stat-vinti').textContent = vinti;
  },

  /**
   * Open Modal Nuovo Cliente
   */
  openModalNuovo() {
    const form = document.getElementById('form-cliente');
    form.reset();
    document.getElementById('cliente-id').value = '';
    document.getElementById('modal-cliente-title').textContent = 'Nuovo Cliente';
    
    const user = AuthManager.getCurrentUser();
    if (user.ruolo === 'consulente') {
      const sel = document.getElementById('cliente-consulente');
      if (sel) sel.value = user.id;
    }
    
    document.getElementById('modal-cliente').classList.remove('hidden');
  },

  /**
   * Open Modal Modifica
   */
  openModalModifica(clienteId) {
    const cliente = this.clienti.find(c => c.id === clienteId);
    if (!cliente) return;

    document.getElementById('modal-cliente-title').textContent = 'Modifica Cliente';
    document.getElementById('cliente-id').value = cliente.id;
    document.getElementById('cliente-nome').value = cliente.nome || '';
    document.getElementById('cliente-cognome').value = cliente.cognome || '';
    document.getElementById('cliente-email').value = cliente.email || '';
    document.getElementById('cliente-telefono').value = cliente.telefono || '';
    document.getElementById('cliente-azienda').value = cliente.azienda || '';
    document.getElementById('cliente-piva').value = cliente.piva || '';
    document.getElementById('cliente-indirizzo').value = cliente.indirizzo || '';
    document.getElementById('cliente-stato').value = cliente.stato || 'nuovo';
    document.getElementById('cliente-note').value = '';
    
    const selCons = document.getElementById('cliente-consulente');
    if (selCons) selCons.value = cliente.consulenteId || '';

    document.getElementById('modal-cliente').classList.remove('hidden');
  },

  /**
   * Open Modal Dettaglio
   */
  openModalDettaglio(clienteId) {
    const cliente = this.clienti.find(c => c.id === clienteId);
    if (!cliente) return;

    this.clienteCorrente = cliente;
    
    // Header
    document.getElementById('dettaglio-title').textContent = `${cliente.nome} ${cliente.cognome}`;
    const stato = this.statiPratica.find(s => s.id === cliente.stato) || this.statiPratica[0];
    const badge = document.getElementById('dettaglio-badge');
    badge.textContent = stato.label;
    badge.className = `badge badge-${stato.color}`;

    // Meta info
    const consulente = this.consulenti.find(c => c.id === cliente.consulenteId);
    document.getElementById('val-commerciale').textContent = consulente ? `${consulente.nome} ${consulente.cognome}` : '-';
    
    // Team Manager
    let tmName = '-';
    if (cliente.teamManagerId) {
      const tm = this.consulenti.find(c => c.id === cliente.teamManagerId);
      if (tm) tmName = `${tm.nome} ${tm.cognome}`;
    } else if (consulente?.teamManagerId) {
      const tm = this.consulenti.find(c => c.id === consulente.teamManagerId);
      if (tm) tmName = `${tm.nome} ${tm.cognome}`;
    }
    document.getElementById('val-teammanager').textContent = tmName;

    // Render tabs
    this.renderTabInfo(cliente);
    this.renderTabStato(cliente);
    this.renderTabNote(cliente);
    this.renderTabStorico(cliente);
    this.renderTabDocumenti(cliente);

    // Reset to first tab
    this.switchTab('info');

    document.getElementById('modal-dettaglio').classList.remove('hidden');
  },

  /**
   * Render Tab Info
   */
  renderTabInfo(cliente) {
    const container = document.getElementById('tab-info');
    container.innerHTML = `
      <div class="info-grid-2col">
        <div class="info-section">
          <h4 class="info-section-title">Dati Personali</h4>
          <div class="info-fields">
            <div class="info-field">
              <span class="info-label">Nome</span>
              <span class="info-value">${this.escapeHtml(cliente.nome || '-')}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Cognome</span>
              <span class="info-value">${this.escapeHtml(cliente.cognome || '-')}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Email</span>
              <span class="info-value">${this.escapeHtml(cliente.email || '-')}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Telefono</span>
              <span class="info-value">${this.escapeHtml(cliente.telefono || '-')}</span>
            </div>
          </div>
        </div>
        <div class="info-section">
          <h4 class="info-section-title">Dati Aziendali</h4>
          <div class="info-fields">
            <div class="info-field">
              <span class="info-label">Azienda</span>
              <span class="info-value">${this.escapeHtml(cliente.azienda || '-')}</span>
            </div>
            <div class="info-field">
              <span class="info-label">P.IVA / C.F.</span>
              <span class="info-value">${this.escapeHtml(cliente.piva || '-')}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Indirizzo</span>
              <span class="info-value">${this.escapeHtml(cliente.indirizzo || '-')}</span>
            </div>
            <div class="info-field">
              <span class="info-label">Data Creazione</span>
              <span class="info-value">${cliente.dataCreazione?.toDate?.() ? cliente.dataCreazione.toDate().toLocaleDateString('it-IT') : '-'}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Render Tab Stato
   */
  renderTabStato(cliente) {
    const container = document.getElementById('tab-stato');
    const canEdit = this.canEditStato();

    container.innerHTML = `
      <div class="stato-section">
        <div class="stato-header">
          <h4>Stato Attuale della Pratica</h4>
          ${!canEdit ? `
            <span class="stato-hint">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Solo Admin può modificare lo stato
            </span>
          ` : ''}
        </div>
        
        <div class="stati-buttons">
          ${this.statiPratica.map(stato => `
            <button 
              class="stato-btn ${cliente.stato === stato.id ? 'active' : ''} stato-btn-${stato.color}"
              data-stato="${stato.id}"
              ${!canEdit ? 'disabled' : ''}
            >
              <span class="stato-dot"></span>
              ${stato.label}
            </button>
          `).join('')}
        </div>
        
        <div class="stato-info-box">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
          Gli stati sono configurabili dal modulo <strong>Impostazioni</strong>
        </div>
      </div>
    `;

    // Event listeners per cambio stato
    if (canEdit) {
      container.querySelectorAll('.stato-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const nuovoStato = e.currentTarget.dataset.stato;
          this.cambiaStato(cliente.id, nuovoStato);
        });
      });
    }
  },

  /**
   * Render Tab Note
   */
  renderTabNote(cliente) {
    const container = document.getElementById('tab-note');
    const note = cliente.note || [];

    container.innerHTML = `
      <div class="note-section">
        <div class="note-form">
          <h4>Aggiungi Nuova Nota</h4>
          <textarea id="nuova-nota-testo" class="form-input form-textarea" rows="3" placeholder="Scrivi una nota..."></textarea>
          <button id="btn-aggiungi-nota" class="btn btn-primary" style="margin-top:12px">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Aggiungi Nota
          </button>
        </div>
        
        <div class="note-list">
          ${note.length === 0 ? `
            <div class="empty-state-small">
              <p>Nessuna nota presente</p>
            </div>
          ` : note.slice().reverse().map(n => `
            <div class="nota-item">
              <p class="nota-testo">${this.escapeHtml(n.testo)}</p>
              <div class="nota-meta">
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                  </svg>
                  ${n.data?.toDate?.() ? n.data.toDate().toLocaleString('it-IT') : '-'}
                </span>
                <span>
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                  ${this.escapeHtml(n.autore || '-')}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Event listener per aggiungere nota
    document.getElementById('btn-aggiungi-nota')?.addEventListener('click', () => {
      this.aggiungiNota(cliente.id);
    });
  },

  /**
   * Render Tab Storico
   */
  renderTabStorico(cliente) {
    const container = document.getElementById('tab-storico');
    const storico = cliente.storico || [];

    container.innerHTML = `
      <div class="storico-section">
        <h4>Storico Modifiche</h4>
        
        ${storico.length === 0 ? `
          <div class="empty-state-small">
            <p>Nessuna modifica registrata</p>
          </div>
        ` : `
          <div class="storico-timeline">
            ${storico.slice().reverse().map((item, index) => `
              <div class="timeline-item">
                <div class="timeline-dot ${index === 0 ? 'active' : ''}"></div>
                <div class="timeline-content">
                  <p class="timeline-text">${this.escapeHtml(item.descrizione)}</p>
                  <div class="timeline-meta">
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      ${item.data?.toDate?.() ? item.data.toDate().toLocaleString('it-IT') : '-'}
                    </span>
                    <span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:14px;height:14px">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                      </svg>
                      ${this.escapeHtml(item.utente || '-')}
                    </span>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  },

  /**
   * Render Tab Documenti
   */
  renderTabDocumenti(cliente) {
    const container = document.getElementById('tab-documenti');
    const documenti = cliente.documenti || [];

    container.innerHTML = `
      <div class="documenti-section">
        ${this.canUploadDocuments() ? `
          <div class="upload-area" id="upload-area">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
            </svg>
            <p>Trascina i file qui oppure</p>
            <label class="btn btn-primary" style="cursor:pointer">
              Seleziona File
              <input type="file" id="file-input" multiple style="display:none">
            </label>
            <small>PDF, DOC, XLS, JPG, PNG (max 10MB)</small>
          </div>
        ` : ''}
        
        <div class="documenti-list">
          ${documenti.length === 0 ? `
            <div class="empty-state-small">
              <p>Nessun documento caricato</p>
            </div>
          ` : documenti.map(doc => `
            <div class="documento-item">
              <div class="documento-icon ${doc.tipo === 'pdf' ? 'pdf' : 'img'}">
                ${doc.tipo?.toUpperCase() || 'FILE'}
              </div>
              <div class="documento-info">
                <p class="documento-nome">${this.escapeHtml(doc.nome)}</p>
                <small>${doc.size || '-'} • ${doc.dataUpload?.toDate?.() ? doc.dataUpload.toDate().toLocaleDateString('it-IT') : '-'} • ${this.escapeHtml(doc.autore || '-')}</small>
              </div>
              <div class="documento-actions">
                <a href="${doc.url}" target="_blank" class="btn btn-secondary btn-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Visualizza
                </a>
                <a href="${doc.url}" download class="btn btn-primary btn-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:16px;height:16px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  Scarica
                </a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Event listener per upload file
    document.getElementById('file-input')?.addEventListener('change', (e) => {
      this.handleFileUpload(e.target.files, cliente.id);
    });
  },

  /**
   * Aggiungi Nota
   */
  async aggiungiNota(clienteId) {
    const testo = document.getElementById('nuova-nota-testo')?.value.trim();
    if (!testo) {
      App.showToast('Scrivi una nota prima di aggiungerla', 'warning');
      return;
    }

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const user = AuthManager.getCurrentUser();

    try {
      await db.collection('clienti').doc(clienteId).update({
        note: firebase.firestore.FieldValue.arrayUnion({
          testo: testo,
          data: firebase.firestore.Timestamp.now(),
          autore: `${user.nome} ${user.cognome}`
        })
      });

      document.getElementById('nuova-nota-testo').value = '';
      App.showToast('Nota aggiunta', 'success');

      // Refresh
      const cliente = this.clienti.find(c => c.id === clienteId);
      if (cliente) {
        const doc = await db.collection('clienti').doc(clienteId).get();
        const updated = { id: doc.id, ...doc.data() };
        this.clienteCorrente = updated;
        this.renderTabNote(updated);
      }
    } catch (error) {
      console.error('Errore aggiunta nota:', error);
      App.showToast('Errore nell\'aggiunta della nota', 'error');
    }
  },

  /**
   * Cambia Stato
   */
  async cambiaStato(clienteId, nuovoStato) {
    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    const cliente = this.clienti.find(c => c.id === clienteId);
    if (!cliente || cliente.stato === nuovoStato) return;

    const user = AuthManager.getCurrentUser();
    const vecchioStatoLabel = this.statiPratica.find(s => s.id === cliente.stato)?.label || cliente.stato;
    const nuovoStatoLabel = this.statiPratica.find(s => s.id === nuovoStato)?.label || nuovoStato;

    try {
      await db.collection('clienti').doc(clienteId).update({
        stato: nuovoStato,
        dataModifica: firebase.firestore.FieldValue.serverTimestamp(),
        storico: firebase.firestore.FieldValue.arrayUnion({
          data: firebase.firestore.Timestamp.now(),
          utente: `${user.nome} ${user.cognome}`,
          descrizione: `Stato cambiato da "${vecchioStatoLabel}" a "${nuovoStatoLabel}"`
        })
      });

      App.showToast(`Stato aggiornato: ${nuovoStatoLabel}`, 'success');

      // Update UI
      document.querySelectorAll('.stato-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.stato === nuovoStato);
      });

      const badge = document.getElementById('dettaglio-badge');
      const statoObj = this.statiPratica.find(s => s.id === nuovoStato);
      if (badge && statoObj) {
        badge.textContent = statoObj.label;
        badge.className = `badge badge-${statoObj.color}`;
      }

      EventBus.emit(CRM_EVENTS.STATO_CHANGED, { id: clienteId, stato: nuovoStato });

    } catch (error) {
      console.error('Errore cambio stato:', error);
      App.showToast('Errore nel cambio stato', 'error');
    }
  },

  /**
   * Handle File Upload
   */
  async handleFileUpload(files, clienteId) {
    if (!files || files.length === 0) return;

    // Nota: per funzionare serve Firebase Storage configurato
    App.showToast('Upload documenti: funzionalità in arrivo con Firebase Storage', 'info');
    
    // TODO: Implementare upload su Firebase Storage quando configurato
    // const storage = firebase.storage();
    // for (const file of files) {
    //   const ref = storage.ref(`clienti/${clienteId}/${file.name}`);
    //   await ref.put(file);
    //   const url = await ref.getDownloadURL();
    //   // Salva riferimento in Firestore
    // }
  },

  /**
   * Send WhatsApp
   */
  sendWhatsApp(template) {
    if (!this.clienteCorrente?.telefono) {
      App.showToast('Nessun numero di telefono disponibile', 'warning');
      return;
    }

    let message = '';
    switch (template) {
      case 'benvenuto':
        message = `Gentile ${this.clienteCorrente.nome}, benvenuto in Strategica!`;
        break;
      case 'documenti':
        message = `Gentile ${this.clienteCorrente.nome}, per procedere con la pratica necessitiamo della seguente documentazione...`;
        break;
      case 'appuntamento':
        message = `Gentile ${this.clienteCorrente.nome}, le confermiamo l'appuntamento per...`;
        break;
      default:
        message = `Gentile ${this.clienteCorrente.nome},`;
    }

    const phone = this.clienteCorrente.telefono.replace(/\s+/g, '').replace(/^\+/, '');
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');

    this.closeModal('modal-whatsapp');
  },

  /**
   * Open Modal Appuntamento
   */
  openModalAppuntamento() {
    if (!this.clienteCorrente) return;
    
    const form = document.getElementById('form-appuntamento');
    form.reset();
    document.getElementById('app-titolo').value = `Appuntamento con ${this.clienteCorrente.nome} ${this.clienteCorrente.cognome}`;
    
    document.getElementById('modal-appuntamento').classList.remove('hidden');
  },

  /**
   * Save Appuntamento
   */
  async handleSaveAppuntamento(e) {
    e.preventDefault();

    const db = window.FirebaseConfig.getDb();
    if (!db || !this.clienteCorrente) return;

    const user = AuthManager.getCurrentUser();
    const dataStr = document.getElementById('app-data').value;
    const oraStr = document.getElementById('app-ora').value;
    const dataOra = new Date(`${dataStr}T${oraStr}`);

    const appuntamento = {
      titolo: document.getElementById('app-titolo').value.trim(),
      data: firebase.firestore.Timestamp.fromDate(dataOra),
      tipo: document.getElementById('app-tipo').value,
      note: document.getElementById('app-note').value.trim(),
      clienteId: this.clienteCorrente.id,
      clienteNome: `${this.clienteCorrente.nome} ${this.clienteCorrente.cognome}`,
      consulenteId: this.clienteCorrente.consulenteId || user.id,
      teamManagerId: this.clienteCorrente.teamManagerId || user.teamManagerId || null,
      dataCreazione: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      await db.collection('appuntamenti').add(appuntamento);
      App.showToast('Appuntamento salvato', 'success');
      this.closeModal('modal-appuntamento');
    } catch (error) {
      console.error('Errore salvataggio appuntamento:', error);
      App.showToast('Errore nel salvataggio', 'error');
    }
  },

  /**
   * Save Cliente
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

    const clienteData = {
      nome: document.getElementById('cliente-nome').value.trim(),
      cognome: document.getElementById('cliente-cognome').value.trim(),
      email: document.getElementById('cliente-email').value.trim().toLowerCase(),
      telefono: document.getElementById('cliente-telefono').value.trim(),
      azienda: document.getElementById('cliente-azienda').value.trim(),
      piva: document.getElementById('cliente-piva').value.trim(),
      indirizzo: document.getElementById('cliente-indirizzo').value.trim(),
      stato: document.getElementById('cliente-stato').value,
      dataModifica: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Consulente
    const selCons = document.getElementById('cliente-consulente');
    if (selCons) {
      clienteData.consulenteId = selCons.value || user.id;
      const consulente = this.consulenti.find(c => c.id === selCons.value);
      clienteData.teamManagerId = consulente?.teamManagerId || null;
    } else {
      clienteData.consulenteId = user.id;
      clienteData.teamManagerId = user.teamManagerId || null;
    }

    try {
      if (isEdit) {
        const clienteOld = this.clienti.find(c => c.id === clienteId);
        const modifiche = [];
        
        if (clienteOld.stato !== clienteData.stato && this.canEditStato()) {
          const vecchio = this.statiPratica.find(s => s.id === clienteOld.stato)?.label;
          const nuovo = this.statiPratica.find(s => s.id === clienteData.stato)?.label;
          modifiche.push(`Stato cambiato da "${vecchio}" a "${nuovo}"`);
        }
        if (clienteOld.consulenteId !== clienteData.consulenteId) {
          modifiche.push('Commerciale assegnato modificato');
        }

        if (modifiche.length > 0) {
          clienteData.storico = firebase.firestore.FieldValue.arrayUnion({
            data: firebase.firestore.Timestamp.now(),
            utente: `${user.nome} ${user.cognome}`,
            descrizione: modifiche.join(', ')
          });
        }

        // Nota iniziale
        const notaIniziale = document.getElementById('cliente-note').value.trim();
        if (notaIniziale) {
          clienteData.note = firebase.firestore.FieldValue.arrayUnion({
            testo: notaIniziale,
            data: firebase.firestore.Timestamp.now(),
            autore: `${user.nome} ${user.cognome}`
          });
        }

        await db.collection('clienti').doc(clienteId).update(clienteData);
        App.showToast('Cliente aggiornato', 'success');

      } else {
        clienteData.dataCreazione = firebase.firestore.FieldValue.serverTimestamp();
        clienteData.storico = [{
          data: firebase.firestore.Timestamp.now(),
          utente: `${user.nome} ${user.cognome}`,
          descrizione: 'Cliente creato'
        }];

        // Nota iniziale
        const notaIniziale = document.getElementById('cliente-note').value.trim();
        if (notaIniziale) {
          clienteData.note = [{
            testo: notaIniziale,
            data: firebase.firestore.Timestamp.now(),
            autore: `${user.nome} ${user.cognome}`
          }];
        } else {
          clienteData.note = [];
        }

        clienteData.documenti = [];

        await db.collection('clienti').add(clienteData);
        App.showToast('Cliente creato', 'success');
      }

      this.closeModal('modal-cliente');

    } catch (error) {
      console.error('Errore salvataggio:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  /**
   * Open Modal Elimina
   */
  openModalElimina(clienteId) {
    document.getElementById('elimina-cliente-id').value = clienteId;
    document.getElementById('modal-elimina').classList.remove('hidden');
  },

  /**
   * Handle Elimina
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
   * Close Modal
   */
  closeModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
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
window.ClientiModule = ClientiModule;
