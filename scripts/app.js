// Clase principal de la aplicación
class AuditApp {
    constructor() {
        this.audits = [];
        this.currentEditingId = null;
        this.filters = {};
        
        this.init();
    }

    // Inicializar la aplicación
    async init() {
        this.bindEvents();
        this.setupDateField();
        
        try {
            await this.loadAudits();
            this.showNotification('Aplicación cargada correctamente', 'success');
        } catch (error) {
            this.showNotification('Error al cargar la aplicación', 'error');
            console.error('Error initializing app:', error);
        }
    }

    // Configurar evento de fecha actual
    setupDateField() {
        const auditDateField = document.getElementById('audit_date');
        if (auditDateField) {
            const today = new Date().toISOString().split('T')[0];
            auditDateField.value = today;
        }
    }

    // Vincular eventos
    bindEvents() {
        // Botones del header
        document.getElementById('newAuditBtn')?.addEventListener('click', () => this.openModal());
        document.getElementById('statsBtn')?.addEventListener('click', () => this.showStats());

        // Filtros
        document.getElementById('applyFilters')?.addEventListener('click', () => this.applyFilters());
        document.getElementById('clearFilters')?.addEventListener('click', () => this.clearFilters());

        // Modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Cerrar modal al hacer clic fuera
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModal(modal);
                }
            });
        });

        // Formulario
        document.getElementById('auditForm')?.addEventListener('submit', (e) => this.handleFormSubmit(e));
        document.getElementById('cancelBtn')?.addEventListener('click', () => this.closeModal(document.getElementById('auditModal')));

        // Manejar checkbox de errores
        document.getElementById('errors_found')?.addEventListener('change', (e) => {
            this.toggleErrorFields(e.target.checked);
        });

        // Notificaciones
        document.querySelector('.notification-close')?.addEventListener('click', () => {
            this.hideNotification();
        });
    }

    // Cargar auditorías
    async loadAudits() {
        try {
            this.showLoading(true);
            this.audits = await window.auditAPI.getAudits(this.filters);
            this.renderTable();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
            console.error('Error loading audits:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // Renderizar tabla
    renderTable() {
        const tbody = document.getElementById('auditsTableBody');
        const noDataMessage = document.getElementById('noDataMessage');

        if (!tbody) return;

        if (this.audits.length === 0) {
            tbody.innerHTML = '';
            noDataMessage.style.display = 'block';
            return;
        }

        noDataMessage.style.display = 'none';
        
        tbody.innerHTML = this.audits.map(audit => `
            <tr>
                <td>${this.formatDate(audit.audit_date)}</td>
                <td>${audit.checked_by}</td>
                <td>${audit.build_cell}</td>
                <td>${audit.order_number || '-'}</td>
                <td>
                    <span class="badge ${audit.errors_found ? 'badge-danger' : 'badge-success'}">
                        ${audit.errors_found ? 'Sí' : 'No'}
                    </span>
                </td>
                <td>${audit.gc_with_errors || 0}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn btn-edit" onclick="auditApp.editAudit('${audit.id}')" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn btn-delete" onclick="auditApp.deleteAudit('${audit.id}')" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    // Formatear fecha
    formatDate(dateString) {
        if (!dateString) return '-';
        
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
        } catch (error) {
            return dateString;
        }
    }

    // Mostrar/ocultar carga
    showLoading(show) {
        const spinner = document.getElementById('loadingSpinner');
        if (spinner) {
            spinner.style.display = show ? 'block' : 'none';
        }
    }

    // Abrir modal
    openModal(auditId = null) {
        const modal = document.getElementById('auditModal');
        const form = document.getElementById('auditForm');
        const modalTitle = document.getElementById('modalTitle');

        if (!modal || !form) return;

        this.currentEditingId = auditId;
        modalTitle.textContent = auditId ? 'Editar Auditoría' : 'Nueva Auditoría';

        if (auditId) {
            this.loadAuditForEdit(auditId);
        } else {
            form.reset();
            this.setupDateField();
        }

        this.toggleErrorFields(false);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    // Cerrar modal
    closeModal(modal) {
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = 'auto';
            
            if (modal.id === 'auditModal') {
                this.currentEditingId = null;
                document.getElementById('auditForm').reset();
            }
        }
    }

    // Cargar auditoría para editar
    async loadAuditForEdit(auditId) {
        try {
            const audit = await window.auditAPI.getAudit(auditId);
            const formData = window.auditAPI.formatAuditForForm(audit);
            
            // Llenar formulario
            Object.keys(formData).forEach(key => {
                const field = document.getElementById(key);
                if (field) {
                    if (field.type === 'checkbox') {
                        field.checked = formData[key];
                    } else {
                        field.value = formData[key];
                    }
                }
            });

            // Mostrar campos de error si es necesario
            this.toggleErrorFields(formData.errors_found);
        } catch (error) {
            this.showNotification(`Error al cargar auditoría: ${error.message}`, 'error');
            console.error('Error loading audit for edit:', error);
        }
    }

    // Alternar campos de error
    toggleErrorFields(show) {
        const errorSections = ['gcWithErrorsGroup', 'errorTypesSection'];
        errorSections.forEach(sectionId => {
            const element = document.getElementById(sectionId);
            if (element) {
                element.style.display = show ? 'block' : 'none';
            }
        });
    }

    // Manejar envío del formulario
    async handleFormSubmit(e) {
        e.preventDefault();
        
        try {
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            
            // Validar datos
            const validation = window.auditAPI.validateAuditData(data);
            if (!validation.isValid) {
                this.showNotification(`Errores de validación: ${validation.errors.join(', ')}`, 'error');
                return;
            }

            // Formatear datos para la API
            const formattedData = window.auditAPI.formatFormData(data);

            // Guardar
            if (this.currentEditingId) {
                await window.auditAPI.updateAudit(this.currentEditingId, formattedData);
                this.showNotification(window.CONFIG.UI.UPDATE_SUCCESS_MESSAGE, 'success');
            } else {
                await window.auditAPI.createAudit(formattedData);
                this.showNotification(window.CONFIG.UI.SAVE_SUCCESS_MESSAGE, 'success');
            }

            // Recargar datos
            await this.loadAudits();
            
            // Cerrar modal
            this.closeModal(document.getElementById('auditModal'));

        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
            console.error('Error saving audit:', error);
        }
    }

    // Editar auditoría
    async editAudit(auditId) {
        this.openModal(auditId);
    }

    // Eliminar auditoría
    async deleteAudit(auditId) {
        if (!confirm(window.CONFIG.UI.CONFIRM_DELETE_MESSAGE)) {
            return;
        }

        try {
            await window.auditAPI.deleteAudit(auditId);
            this.showNotification(window.CONFIG.UI.DELETE_SUCCESS_MESSAGE, 'success');
            await this.loadAudits();
        } catch (error) {
            this.showNotification(`Error: ${error.message}`, 'error');
            console.error('Error deleting audit:', error);
        }
    }

    // Aplicar filtros
    async applyFilters() {
        this.filters = {
            checked_by: document.getElementById('filterAuditor').value,
            build_cell: document.getElementById('filterCell').value,
            audit_date: document.getElementById('filterDate').value
        };

        await this.loadAudits();
    }

    // Limpiar filtros
    async clearFilters() {
        document.getElementById('filterAuditor').value = '';
        document.getElementById('filterCell').value = '';
        document.getElementById('filterDate').value = '';
        
        this.filters = {};
        await this.loadAudits();
    }

    // Mostrar estadísticas
    async showStats() {
        try {
            const stats = await window.auditAPI.getStats();
            this.renderStats(stats);
            
            const modal = document.getElementById('statsModal');
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        } catch (error) {
            this.showNotification(`Error al cargar estadísticas: ${error.message}`, 'error');
            console.error('Error loading stats:', error);
        }
    }

    // Renderizar estadísticas
    renderStats(stats) {
        const container = document.getElementById('statsData');
        if (!container || !stats) return;

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${stats.totalAudits}</div>
                    <div class="stat-label">Total Auditorías</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.auditsWithErrors}</div>
                    <div class="stat-label">Con Errores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.totalErrors}</div>
                    <div class="stat-label">Total Errores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${stats.auditsWithErrorsPercentage}%</div>
                    <div class="stat-label">% Con Errores</div>
                </div>
            </div>
            
            <div class="stats-breakdown">
                <h4>Auditorías por Auditor</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                    ${Object.entries(stats.statsByAuditor || {}).map(([auditor, count]) => `
                        <div style="text-align: center; padding: 1rem; background: white; border-radius: 6px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${count}</div>
                            <div style="font-size: 0.875rem; color: #6c757d;">${auditor}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stats-breakdown" style="margin-top: 1.5rem;">
                <h4>Auditorías por Celda</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                    ${Object.entries(stats.statsByCell || {}).map(([cell, count]) => `
                        <div style="text-align: center; padding: 1rem; background: white; border-radius: 6px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${count}</div>
                            <div style="font-size: 0.875rem; color: #6c757d;">Celda ${cell}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 1.5rem; color: #6c757d; font-size: 0.875rem;">
                <i class="fas fa-info-circle"></i> Período: ${stats.period}
            </div>
        `;
    }

    // Mostrar notificación
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');

        if (!notification || !messageElement) return;

        messageElement.textContent = message;
        notification.className = `notification ${type} show`;

        // Auto-hide después de 5 segundos
        setTimeout(() => {
            this.hideNotification();
        }, window.CONFIG.NOTIFICATIONS.AUTO_HIDE_DELAY);
    }

    // Ocultar notificación
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('show');
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.auditApp = new AuditApp();
});