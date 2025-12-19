// Modulo Impostazioni per CRM Strategica
// ========================================
// Solo Admin - Gestione utenti, stati workflow e dati

const ImpostazioniModule = {
  container: null,
  users: [],
  stati: [],
  activeTab: 'utenti',
  unsubscribeUsers: null,
  unsubscribeStati: null,

  /**
   * Inizializza il modulo
   */
  async init() {
    this.container = document.getElementById('module-container');
    if (!this.container) return;

    // Verifica che l'utente sia admin
    if (!AuthManager.isAdmin()) {
      this.container.innerHTML = `
        <div class="settings-access-denied">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <h2>Accesso Negato</h2>
          <p>Solo gli amministratori possono accedere a questa sezione.</p>
        </div>
      `;
      return;
    }

    this.render();
    this.bindEvents();
    await this.loadData();
  },

  /**
   * Carica dati da Firebase con listener real-time
   */
  async loadData() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Errore connessione database', 'error');
      return;
    }

    // Listener real-time per utenti
    this.unsubscribeUsers = db.collection('users')
      .orderBy('cognome')
      .onSnapshot(snapshot => {
        this.users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.renderUsersTable();
      }, error => {
        console.error('Errore caricamento utenti:', error);
      });

    // Listener real-time per stati
    this.unsubscribeStati = db.collection('stati')
      .orderBy('ordine')
      .onSnapshot(snapshot => {
        this.stati = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        this.renderStatiList();
      }, error => {
        console.error('Errore caricamento stati:', error);
      });
  },

  /**
   * Cleanup quando si esce dal modulo
   */
  cleanup() {
    if (this.unsubscribeUsers) {
      this.unsubscribeUsers();
      this.unsubscribeUsers = null;
    }
    if (this.unsubscribeStati) {
      this.unsubscribeStati();
      this.unsubscribeStati = null;
    }
  },

  /**
   * Render principale del modulo
   */
  render() {
    this.container.innerHTML = `
      <div class="settings-module">
        <!-- Tabs -->
        <div class="settings-tabs">
          <button class="settings-tab active" data-tab="utenti">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
            Gestione Utenti
          </button>
          <button class="settings-tab" data-tab="stati">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.098 19.902a3.75 3.75 0 005.304 0l6.401-6.402M6.75 21A3.75 3.75 0 013 17.25V4.125C3 3.504 3.504 3 4.125 3h5.25c.621 0 1.125.504 1.125 1.125v4.072M6.75 21a3.75 3.75 0 003.75-3.75V8.197M6.75 21h13.125c.621 0 1.125-.504 1.125-1.125v-5.25c0-.621-.504-1.125-1.125-1.125h-4.072M10.5 8.197l2.88-2.88c.438-.439 1.15-.439 1.59 0l3.712 3.713c.44.44.44 1.152 0 1.59l-2.879 2.88M6.75 17.25h.008v.008H6.75v-.008z" />
            </svg>
            Stati Workflow
          </button>
          <button class="settings-tab settings-tab-danger" data-tab="danger">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            Zona Pericolo
          </button>
        </div>

        <!-- Tab Content -->
        <div class="settings-content">
          <!-- Tab Utenti -->
          <div id="tab-utenti" class="settings-tab-content active">
            <div class="settings-header">
              <div>
                <h2 class="settings-section-title">Utenti del CRM</h2>
                <p class="settings-section-desc">Gestisci Team Manager e Consulenti</p>
              </div>
              <button id="btn-new-user" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
                Nuovo Utente
              </button>
            </div>
            <div class="settings-table-wrapper">
              <table class="settings-table">
                <thead>
                  <tr>
                    <th>Utente</th>
                    <th>Contatti</th>
                    <th>Ruolo</th>
                    <th>Team Manager</th>
                    <th>Stato</th>
                    <th class="text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody id="users-table-body">
                  <tr>
                    <td colspan="6" class="text-center text-muted">Caricamento...</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Tab Stati -->
          <div id="tab-stati" class="settings-tab-content">
            <div class="settings-header">
              <div>
                <h2 class="settings-section-title">Stati del Workflow</h2>
                <p class="settings-section-desc">Definisci gli stati delle pratiche clienti</p>
              </div>
              <button id="btn-new-stato" class="btn btn-primary">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Nuovo Stato
              </button>
            </div>
            <div id="stati-list" class="stati-list">
              <div class="text-center text-muted" style="padding:2rem">Caricamento...</div>
            </div>
          </div>

          <!-- Tab Zona Pericolo -->
          <div id="tab-danger" class="settings-tab-content">
            <div class="danger-zone">
              <div class="danger-zone-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div class="danger-zone-content">
                <h3>Svuota Dati Demo</h3>
                <p>Questa azione eliminerà tutti i clienti di test dal database. L'operazione è irreversibile.</p>
                <button id="btn-clear-demo" class="btn btn-danger">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:18px;height:18px">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                  Elimina Tutti i Clienti Demo
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Modal Utente -->
      <div id="modal-user" class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="modal-user-title">Nuovo Utente</h3>
            <button class="modal-close" data-close="modal-user">&times;</button>
          </div>
          <form id="form-user" class="modal-body">
            <input type="hidden" id="user-id">
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Nome *</label>
                <input type="text" id="user-nome" class="form-input" placeholder="Mario" required>
              </div>
              <div class="form-group">
                <label class="form-label">Cognome *</label>
                <input type="text" id="user-cognome" class="form-input" placeholder="Rossi" required>
              </div>
            </div>
            
            <div class="form-group">
              <label class="form-label">Email *</label>
              <input type="email" id="user-email" class="form-input" placeholder="mario.rossi@email.com" required>
            </div>
            
            <div class="form-group">
              <label class="form-label">Telefono</label>
              <input type="tel" id="user-telefono" class="form-input" placeholder="333 1234567">
            </div>
            
            <div class="form-group">
              <label class="form-label">Ruolo *</label>
              <select id="user-ruolo" class="form-input" required>
                <option value="consulente">Consulente</option>
                <option value="team_manager">Team Manager</option>
              </select>
            </div>
            
            <div class="form-group" id="team-manager-group">
              <label class="form-label">Team Manager</label>
              <select id="user-team-manager" class="form-input">
                <option value="">-- Nessuno --</option>
              </select>
            </div>
            
            <div class="form-group" id="password-group">
              <label class="form-label">Password *</label>
              <input type="password" id="user-password" class="form-input" placeholder="Minimo 6 caratteri">
              <small class="form-hint">La password verrà usata per accedere al CRM</small>
            </div>
          </form>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close="modal-user">Annulla</button>
            <button type="submit" form="form-user" class="btn btn-primary" id="btn-save-user">Salva</button>
          </div>
        </div>
      </div>

      <!-- Modal Stato -->
      <div id="modal-stato" class="modal-overlay">
        <div class="modal-content modal-sm">
          <div class="modal-header">
            <h3 id="modal-stato-title">Nuovo Stato</h3>
            <button class="modal-close" data-close="modal-stato">&times;</button>
          </div>
          <form id="form-stato" class="modal-body">
            <input type="hidden" id="stato-id">
            
            <div class="form-group">
              <label class="form-label">Nome Stato *</label>
              <input type="text" id="stato-nome" class="form-input" placeholder="Es. In Trattativa" required>
            </div>
            
            <div class="form-group">
              <label class="form-label">Colore</label>
              <div class="color-picker-row">
                <input type="color" id="stato-colore" class="color-picker" value="#0067A0">
                <div class="color-preview">
                  <span class="form-label">Anteprima:</span>
                  <span id="stato-badge-preview" class="badge" style="background:#0067A0;color:#fff">Nome Stato</span>
                </div>
              </div>
            </div>
          </form>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-close="modal-stato">Annulla</button>
            <button type="submit" form="form-stato" class="btn btn-primary">Salva</button>
          </div>
        </div>
      </div>

      <!-- Modal Conferma Eliminazione -->
      <div id="modal-confirm-delete" class="modal-overlay">
        <div class="modal-content modal-sm">
          <div class="modal-body text-center" style="padding:2rem">
            <div class="confirm-icon danger">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <h3 style="margin:1rem 0 0.5rem">Sei sicuro?</h3>
            <p class="text-muted" id="confirm-delete-message">Stai per eliminare tutti i clienti demo. Questa azione non può essere annullata.</p>
          </div>
          <div class="modal-footer" style="justify-content:center">
            <button type="button" class="btn btn-secondary" data-close="modal-confirm-delete">Annulla</button>
            <button type="button" class="btn btn-danger" id="btn-confirm-delete">Sì, Elimina</button>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * Binding degli eventi
   */
  bindEvents() {
    // Tab switching
    this.container.querySelectorAll('.settings-tab').forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    // Nuovo utente
    document.getElementById('btn-new-user')?.addEventListener('click', () => {
      this.openUserModal();
    });

    // Nuovo stato
    document.getElementById('btn-new-stato')?.addEventListener('click', () => {
      this.openStatoModal();
    });

    // Form utente
    document.getElementById('form-user')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveUser();
    });

    // Form stato
    document.getElementById('form-stato')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveStato();
    });

    // Cambio ruolo utente - mostra/nasconde team manager
    document.getElementById('user-ruolo')?.addEventListener('change', (e) => {
      const tmGroup = document.getElementById('team-manager-group');
      if (tmGroup) {
        tmGroup.style.display = e.target.value === 'consulente' ? 'block' : 'none';
      }
    });

    // Preview colore stato
    document.getElementById('stato-colore')?.addEventListener('input', (e) => {
      const preview = document.getElementById('stato-badge-preview');
      if (preview) {
        preview.style.background = e.target.value;
      }
    });

    // Preview nome stato
    document.getElementById('stato-nome')?.addEventListener('input', (e) => {
      const preview = document.getElementById('stato-badge-preview');
      if (preview) {
        preview.textContent = e.target.value || 'Nome Stato';
      }
    });

    // Chiudi modal
    this.container.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.dataset.close;
        this.closeModal(modalId);
      });
    });

    // Chiudi modal cliccando overlay
    this.container.querySelectorAll('.modal-overlay').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    // Svuota dati demo
    document.getElementById('btn-clear-demo')?.addEventListener('click', () => {
      this.showDeleteConfirm('demo');
    });

    // Conferma eliminazione
    document.getElementById('btn-confirm-delete')?.addEventListener('click', () => {
      this.executeDelete();
    });

    // Eventi delegati per azioni tabella
    this.container.addEventListener('click', (e) => {
      const editUserBtn = e.target.closest('[data-edit-user]');
      const toggleUserBtn = e.target.closest('[data-toggle-user]');
      const editStatoBtn = e.target.closest('[data-edit-stato]');
      const deleteStatoBtn = e.target.closest('[data-delete-stato]');
      const moveStatoUp = e.target.closest('[data-move-up]');
      const moveStatoDown = e.target.closest('[data-move-down]');

      if (editUserBtn) {
        const userId = editUserBtn.dataset.editUser;
        this.openUserModal(userId);
      }
      if (toggleUserBtn) {
        const userId = toggleUserBtn.dataset.toggleUser;
        this.toggleUserStatus(userId);
      }
      if (editStatoBtn) {
        const statoId = editStatoBtn.dataset.editStato;
        this.openStatoModal(statoId);
      }
      if (deleteStatoBtn) {
        const statoId = deleteStatoBtn.dataset.deleteStato;
        this.showDeleteConfirm('stato', statoId);
      }
      if (moveStatoUp) {
        const statoId = moveStatoUp.dataset.moveUp;
        this.moveStato(statoId, 'up');
      }
      if (moveStatoDown) {
        const statoId = moveStatoDown.dataset.moveDown;
        this.moveStato(statoId, 'down');
      }
    });
  },

  /**
   * Cambia tab attiva
   */
  switchTab(tabName) {
    this.activeTab = tabName;

    // Aggiorna tab buttons
    this.container.querySelectorAll('.settings-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.tab === tabName);
    });

    // Aggiorna contenuto
    this.container.querySelectorAll('.settings-tab-content').forEach(content => {
      content.classList.toggle('active', content.id === `tab-${tabName}`);
    });
  },

  /**
   * Render tabella utenti
   */
  renderUsersTable() {
    const tbody = document.getElementById('users-table-body');
    if (!tbody) return;

    if (this.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="text-center text-muted" style="padding:2rem">
            Nessun utente trovato. Clicca "Nuovo Utente" per aggiungerne uno.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = this.users.map(user => {
      const initials = (user.nome?.charAt(0) || '') + (user.cognome?.charAt(0) || '');
      const teamManager = user.teamManagerId ? this.users.find(u => u.id === user.teamManagerId) : null;
      const roleLabel = this.getRoleLabel(user.ruolo);
      const roleBadgeClass = this.getRoleBadgeClass(user.ruolo);

      return `
        <tr class="${!user.attivo ? 'row-disabled' : ''}">
          <td>
            <div class="user-cell">
              <div class="user-avatar">${initials}</div>
              <div class="user-info">
                <div class="user-name">${user.nome} ${user.cognome}</div>
              </div>
            </div>
          </td>
          <td>
            <div class="contact-info">
              <div class="contact-row">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                ${user.email}
              </div>
              ${user.telefono ? `
                <div class="contact-row">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
                  </svg>
                  ${user.telefono}
                </div>
              ` : ''}
            </div>
          </td>
          <td>
            <span class="badge ${roleBadgeClass}">${roleLabel}</span>
          </td>
          <td>
            ${teamManager ? `${teamManager.nome} ${teamManager.cognome}` : '<span class="text-muted">-</span>'}
          </td>
          <td>
            <span class="badge ${user.attivo ? 'badge-success' : 'badge-danger'}">
              ${user.attivo ? 'Attivo' : 'Disattivato'}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              <button class="btn-icon" data-edit-user="${user.id}" title="Modifica">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
              <button class="btn-icon ${user.attivo ? 'btn-icon-danger' : 'btn-icon-success'}" 
                      data-toggle-user="${user.id}" 
                      title="${user.attivo ? 'Disattiva' : 'Riattiva'}">
                ${user.attivo ? `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ` : `
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                `}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  /**
   * Render lista stati
   */
  renderStatiList() {
    const container = document.getElementById('stati-list');
    if (!container) return;

    if (this.stati.length === 0) {
      container.innerHTML = `
        <div class="text-center text-muted" style="padding:2rem">
          Nessuno stato configurato. Clicca "Nuovo Stato" per aggiungerne uno.
        </div>
      `;
      return;
    }

    container.innerHTML = this.stati.map((stato, index) => `
      <div class="stato-item">
        <div class="stato-order-buttons">
          <button class="btn-icon-sm" data-move-up="${stato.id}" ${index === 0 ? 'disabled' : ''} title="Sposta su">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
            </svg>
          </button>
          <button class="btn-icon-sm" data-move-down="${stato.id}" ${index === this.stati.length - 1 ? 'disabled' : ''} title="Sposta giù">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>
        <div class="stato-color" style="background-color: ${stato.colore}"></div>
        <div class="stato-info">
          <div class="stato-name">${stato.nome}</div>
          <div class="stato-order">Ordine: ${stato.ordine}</div>
        </div>
        <span class="badge" style="background-color: ${stato.colore}; color: #fff">
          Anteprima
        </span>
        <div class="stato-actions">
          <button class="btn-icon" data-edit-stato="${stato.id}" title="Modifica">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button class="btn-icon btn-icon-danger" data-delete-stato="${stato.id}" title="Elimina">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Apre modal utente (nuovo o modifica)
   */
  openUserModal(userId = null) {
    const modal = document.getElementById('modal-user');
    const title = document.getElementById('modal-user-title');
    const form = document.getElementById('form-user');
    const passwordGroup = document.getElementById('password-group');
    const tmGroup = document.getElementById('team-manager-group');
    const tmSelect = document.getElementById('user-team-manager');

    // Popola select team manager
    const teamManagers = this.users.filter(u => u.ruolo === 'team_manager' && u.attivo);
    tmSelect.innerHTML = '<option value="">-- Nessuno --</option>' +
      teamManagers.map(tm => `<option value="${tm.id}">${tm.nome} ${tm.cognome}</option>`).join('');

    if (userId) {
      // Modifica utente esistente
      const user = this.users.find(u => u.id === userId);
      if (!user) return;

      title.textContent = 'Modifica Utente';
      document.getElementById('user-id').value = user.id;
      document.getElementById('user-nome').value = user.nome || '';
      document.getElementById('user-cognome').value = user.cognome || '';
      document.getElementById('user-email').value = user.email || '';
      document.getElementById('user-telefono').value = user.telefono || '';
      document.getElementById('user-ruolo').value = user.ruolo || 'consulente';
      document.getElementById('user-team-manager').value = user.teamManagerId || '';
      
      // Nascondi password per modifica
      passwordGroup.style.display = 'none';
      document.getElementById('user-password').removeAttribute('required');
      
      // Mostra/nascondi team manager
      tmGroup.style.display = user.ruolo === 'consulente' ? 'block' : 'none';
    } else {
      // Nuovo utente
      title.textContent = 'Nuovo Utente';
      form.reset();
      document.getElementById('user-id').value = '';
      
      // Mostra password per nuovo utente
      passwordGroup.style.display = 'block';
      document.getElementById('user-password').setAttribute('required', 'required');
      
      // Mostra team manager (default consulente)
      tmGroup.style.display = 'block';
    }

    modal.classList.add('active');
  },

  /**
   * Salva utente (nuovo o modifica)
   */
  async saveUser() {
    const userId = document.getElementById('user-id').value;
    const nome = document.getElementById('user-nome').value.trim();
    const cognome = document.getElementById('user-cognome').value.trim();
    const email = document.getElementById('user-email').value.trim().toLowerCase();
    const telefono = document.getElementById('user-telefono').value.trim();
    const ruolo = document.getElementById('user-ruolo').value;
    const teamManagerId = document.getElementById('user-team-manager').value;
    const password = document.getElementById('user-password').value;

    // Validazione
    if (!nome || !cognome || !email) {
      App.showToast('Compila tutti i campi obbligatori', 'error');
      return;
    }

    if (!userId && !password) {
      App.showToast('La password è obbligatoria per i nuovi utenti', 'error');
      return;
    }

    if (!userId && password.length < 6) {
      App.showToast('La password deve avere almeno 6 caratteri', 'error');
      return;
    }

    // Verifica email duplicata
    const emailExists = this.users.some(u => u.email === email && u.id !== userId);
    if (emailExists) {
      App.showToast('Esiste già un utente con questa email', 'error');
      return;
    }

    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Errore connessione database', 'error');
      return;
    }

    const userData = {
      nome,
      cognome,
      email,
      telefono,
      ruolo,
      teamManagerId: ruolo === 'consulente' ? teamManagerId : null,
      attivo: true,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
      if (userId) {
        // Modifica
        await db.collection('users').doc(userId).update(userData);
        App.showToast('Utente modificato con successo', 'success');
      } else {
        // Nuovo - aggiungi password e createdAt
        userData.password = password;
        userData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('users').add(userData);
        App.showToast('Utente creato con successo', 'success');
      }

      this.closeModal('modal-user');
    } catch (error) {
      console.error('Errore salvataggio utente:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  /**
   * Toggle stato attivo/disattivo utente
   */
  async toggleUserStatus(userId) {
    const user = this.users.find(u => u.id === userId);
    if (!user) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    try {
      await db.collection('users').doc(userId).update({
        attivo: !user.attivo,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      App.showToast(user.attivo ? 'Utente disattivato' : 'Utente riattivato', 'success');
    } catch (error) {
      console.error('Errore toggle utente:', error);
      App.showToast('Errore durante l\'operazione', 'error');
    }
  },

  /**
   * Apre modal stato (nuovo o modifica)
   */
  openStatoModal(statoId = null) {
    const modal = document.getElementById('modal-stato');
    const title = document.getElementById('modal-stato-title');
    const form = document.getElementById('form-stato');
    const preview = document.getElementById('stato-badge-preview');

    if (statoId) {
      const stato = this.stati.find(s => s.id === statoId);
      if (!stato) return;

      title.textContent = 'Modifica Stato';
      document.getElementById('stato-id').value = stato.id;
      document.getElementById('stato-nome').value = stato.nome || '';
      document.getElementById('stato-colore').value = stato.colore || '#0067A0';
      preview.textContent = stato.nome || 'Nome Stato';
      preview.style.background = stato.colore || '#0067A0';
    } else {
      title.textContent = 'Nuovo Stato';
      form.reset();
      document.getElementById('stato-id').value = '';
      document.getElementById('stato-colore').value = '#0067A0';
      preview.textContent = 'Nome Stato';
      preview.style.background = '#0067A0';
    }

    modal.classList.add('active');
  },

  /**
   * Salva stato (nuovo o modifica)
   */
  async saveStato() {
    const statoId = document.getElementById('stato-id').value;
    const nome = document.getElementById('stato-nome').value.trim();
    const colore = document.getElementById('stato-colore').value;

    if (!nome) {
      App.showToast('Inserisci il nome dello stato', 'error');
      return;
    }

    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Errore connessione database', 'error');
      return;
    }

    try {
      if (statoId) {
        // Modifica
        await db.collection('stati').doc(statoId).update({
          nome,
          colore,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        App.showToast('Stato modificato con successo', 'success');
      } else {
        // Nuovo - calcola ordine
        const maxOrdine = this.stati.reduce((max, s) => Math.max(max, s.ordine || 0), 0);
        await db.collection('stati').add({
          nome,
          colore,
          ordine: maxOrdine + 1,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        App.showToast('Stato creato con successo', 'success');
      }

      this.closeModal('modal-stato');
    } catch (error) {
      console.error('Errore salvataggio stato:', error);
      App.showToast('Errore durante il salvataggio', 'error');
    }
  },

  /**
   * Sposta stato su/giù
   */
  async moveStato(statoId, direction) {
    const index = this.stati.findIndex(s => s.id === statoId);
    if (index === -1) return;

    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= this.stati.length) return;

    const db = window.FirebaseConfig.getDb();
    if (!db) return;

    // Scambia ordini
    const stato1 = this.stati[index];
    const stato2 = this.stati[newIndex];

    const batch = db.batch();
    batch.update(db.collection('stati').doc(stato1.id), { ordine: stato2.ordine });
    batch.update(db.collection('stati').doc(stato2.id), { ordine: stato1.ordine });

    try {
      await batch.commit();
    } catch (error) {
      console.error('Errore spostamento stato:', error);
      App.showToast('Errore durante lo spostamento', 'error');
    }
  },

  /**
   * Mostra modal conferma eliminazione
   */
  showDeleteConfirm(type, id = null) {
    const modal = document.getElementById('modal-confirm-delete');
    const message = document.getElementById('confirm-delete-message');
    const confirmBtn = document.getElementById('btn-confirm-delete');

    this.deleteType = type;
    this.deleteId = id;

    if (type === 'demo') {
      message.textContent = 'Stai per eliminare tutti i clienti demo. Questa azione non può essere annullata.';
    } else if (type === 'stato') {
      const stato = this.stati.find(s => s.id === id);
      message.textContent = `Stai per eliminare lo stato "${stato?.nome}". I clienti con questo stato non verranno eliminati.`;
    }

    modal.classList.add('active');
  },

  /**
   * Esegue eliminazione
   */
  async executeDelete() {
    const db = window.FirebaseConfig.getDb();
    if (!db) {
      App.showToast('Errore connessione database', 'error');
      return;
    }

    try {
      if (this.deleteType === 'demo') {
        // Elimina tutti i clienti
        const clientiSnapshot = await db.collection('clienti').get();
        const batch = db.batch();
        clientiSnapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        App.showToast(`Eliminati ${clientiSnapshot.size} clienti demo`, 'success');
      } else if (this.deleteType === 'stato') {
        await db.collection('stati').doc(this.deleteId).delete();
        App.showToast('Stato eliminato con successo', 'success');
      }

      this.closeModal('modal-confirm-delete');
    } catch (error) {
      console.error('Errore eliminazione:', error);
      App.showToast('Errore durante l\'eliminazione', 'error');
    }
  },

  /**
   * Chiude un modal
   */
  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
    }
  },

  /**
   * Helpers
   */
  getRoleLabel(ruolo) {
    const labels = {
      'admin': 'Amministratore',
      'team_manager': 'Team Manager',
      'consulente': 'Consulente'
    };
    return labels[ruolo] || ruolo;
  },

  getRoleBadgeClass(ruolo) {
    const classes = {
      'admin': 'badge-admin',
      'team_manager': 'badge-tm',
      'consulente': 'badge-consulente'
    };
    return classes[ruolo] || '';
  }
};

// Export globale
window.ImpostazioniModule = ImpostazioniModule;
