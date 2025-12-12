// Clase principal de la aplicación
class AuditApp {
    constructor() {
        this.audits = [];
        this.currentEditingId = null;
        this.filters = {};
        this.config = this.getConfig();
        
        // Variables de paginación
        this.currentPage = 1;
        this.pageSize = 50;
        this.totalRecords = 0;
        this.totalPages = 0;
        
        this.init();
    }

    // Función auxiliar para obtener fecha en formato YYYY-MM-DD usando zona local
    getLocalDateString(date = new Date()) {
        // CORRECCIÓN CRÍTICA: Crear fecha local sin conversión automática de zona horaria
        // Usar método que garantiza fecha local del usuario
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Función auxiliar para obtener fecha de ayer en formato YYYY-MM-DD
    getYesterdayDateString() {
        const today = new Date();
        const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
        return this.getLocalDateString(yesterday);
    }

    // Debug: Función para verificar la fecha actual
    debugCurrentDate() {
        const now = new Date();
        const localDate = this.getLocalDateString();
        console.log('Debug Fechas DETALLADO:');
        console.log('Fecha actual (new Date()):', now.toString());
        console.log(' getFullYear():', now.getFullYear());
        console.log(' getMonth():', now.getMonth());
        console.log(' getDate():', now.getDate());
        console.log(' getHours():', now.getHours());
        console.log(' getMinutes():', now.getMinutes());
        console.log(' getTimezoneOffset():', now.getTimezoneOffset());
        console.log(' toLocaleDateString(en-CA):', now.toLocaleDateString('en-CA'));
        console.log(' this.getLocalDateString():', localDate);
        console.log('Fecha UTC (ISO):', now.toISOString().split('T')[0]);
        console.log('Día de la semana:', now.toLocaleDateString('en-US', { weekday: 'long' }));
        return localDate;
    }

    // Función auxiliar para corregir fechas desfasadas por zona horaria
    correctDateForTimezone(dateString) {
        if (!dateString || !/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        const [year, month, day] = dateString.split('-');
        const dayNum = parseInt(day);
        
        // CORRECCIÓN PARA ZONA HORARIA: Si el día es 21,22,23, probablemente está desfasado
        if (dayNum >= 21 && dayNum <= 23) {
            const correctedDay = String(dayNum - 1).padStart(2, '0');
            const correctedDate = `${year}-${month}-${correctedDay}`;
            console.log(`Corrección de zona horaria: ${dateString} → ${correctedDate}`);
            return correctedDate;
        }
        
        return dateString;
    }

    // Función auxiliar para formatear fecha de forma segura
    formatDateSafely(dateStr) {
        if (!dateStr) return '';
        
        // Aplicar corrección de zona horaria
        const correctedDate = this.correctDateForTimezone(dateStr);
        
        // Si ya está en formato YYYY-MM-DD, devolverlo tal como está
        if (/^\d{4}-\d{2}-\d{2}$/.test(correctedDate)) {
            return correctedDate;
        }
        
        // Si no, intentar parsearla y formatearla
        const date = new Date(correctedDate);
        if (!isNaN(date.getTime())) {
            // Asegurar que sea fecha local, no UTC
            const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            return localDate.toLocaleDateString('en-CA');
        }
        
        return correctedDate;
    }

    // Obtener configuración de forma segura
    getConfig() {
        const defaultConfig = {
            UI: {
                UPDATE_SUCCESS_MESSAGE: 'Auditoría actualizada exitosamente',
                SAVE_SUCCESS_MESSAGE: 'Auditoría guardada exitosamente',
                CONFIRM_DELETE_MESSAGE: '¿Está seguro que desea eliminar esta auditoría?',
                DELETE_SUCCESS_MESSAGE: 'Auditoría eliminada exitosamente'
            },
            NOTIFICATIONS: {
                AUTO_HIDE_DELAY: 5000
            },
            VALIDATION: {
                REQUIRED_FIELDS: ['checked_by', 'audit_date', 'build_cell', 'errors_found']
            },
            ERROR_TYPES: {
                components: 'Components',
                tipping: 'Tipping',
                hosel_setting: 'Hosel Setting',
                shaft_stepping: 'Shaft Stepping',
                wood_putter_weights: 'Wood/Putter Weights',
                club_length: 'Club Length',
                shaft_alignment: 'Shaft Alignment',
                ferrules: 'Ferrules',
                loft: 'Loft',
                lie: 'Lie',
                grip_alignment: 'Grip Alignment',
                grip_length: 'Grip Length',
                wraps: 'Wraps',
                swing_weight: 'Swing Weight',
                cleanliness: 'Cleanliness',
                boxing: 'Boxing'
            }
        };
        
        return window.CONFIG || defaultConfig;
    }

    // Inicializar la aplicación
    async init() {
        this.bindEvents();
        this.setupDateField();
        
        // Debug: Mostrar información de fechas al inicializar
        this.debugCurrentDate();
        
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
            // Usar fecha local del usuario usando función auxiliar
            const today = this.getLocalDateString();
            auditDateField.value = today;
            
            // Debug: Mostrar la fecha que se está configurando
            console.log('setupDateField - Fecha configurada:', today);
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

        // Exportar datos
        document.getElementById('exportExcelBtn')?.addEventListener('click', () => this.exportToExcel());
        document.getElementById('exportPdfBtn')?.addEventListener('click', () => this.exportToPDF());

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

    // Cargar auditorías con paginación
    async loadAudits() {
        try {
            this.showLoading(true);
            
            // Calcular offset basado en página actual
            const offset = (this.currentPage - 1) * this.pageSize;
            
            // Combinar filtros con paginación
            const queryParams = {
                ...this.filters,
                limit: this.pageSize,
                offset: offset
            };
            
            // Cargar datos con paginación
            this.audits = await window.auditAPI.getAudits(queryParams);
            
            console.log('=== LOAD AUDITS DEBUG ===');
            console.log('Datos originales de Supabase:', this.audits.map(a => ({
                id: a.id,
                audit_date: a.audit_date,
                checked_by: a.checked_by
            })));
            
            // CORRECCIÓN: Ajustar fechas que están desfasadas por zona horaria
            this.audits = this.audits.map(audit => {
                if (audit.audit_date && /^\d{4}-\d{2}-\d{2}$/.test(audit.audit_date)) {
                    const correctedDate = this.correctDateForTimezone(audit.audit_date);
                    if (correctedDate !== audit.audit_date) {
                        audit.audit_date = correctedDate;
                    }
                }
                return audit;
            });
            
            console.log('Datos después de corrección:', this.audits.map(a => ({
                id: a.id,
                audit_date: a.audit_date,
                checked_by: a.checked_by
            })));
            console.log('=== END LOAD AUDITS DEBUG ===');
            
            // Obtener total de registros para calcular páginas
            this.totalRecords = await window.auditAPI.getAuditsCount(this.filters);
            this.totalPages = Math.ceil(this.totalRecords / this.pageSize);
            
            this.renderTable();
            this.renderPagination();
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
        
        console.log('renderTable - Debug de fechas:');
        this.audits.forEach((audit, index) => {
            console.log(`Registro ${index + 1}:`, {
                id: audit.id,
                audit_date_original: audit.audit_date,
                tipo_dato: typeof audit.audit_date,
                longitud: audit.audit_date ? audit.audit_date.length : 'undefined'
            });
        });
        
        tbody.innerHTML = this.audits.map(audit => `
            <tr>
                <td>${this.formatDate(audit.audit_date)}</td>
                <td>${audit.checked_by}</td>
                <td>${audit.build_cell}</td>
                <td>${audit.order_number || '-'}</td>
                <td>${audit.sh || '-'}</td>
                <td>${audit.qty_of_gc_in_order || '-'}</td>
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
            console.log('=== FORMAT DATE DEBUG ===');
            console.log('Fecha original:', dateString);
            console.log('Timezone offset:', new Date().getTimezoneOffset(), 'minutos');
            console.log('¿Es zona horaria negativa?:', new Date().getTimezoneOffset() < 0);
            
            // CORRECCIÓN DIRECTA: Si la fecha está en formato YYYY-MM-DD, aplicarla directamente
            // SIN CONVERSIONES que puedan causar desfasajes
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
                const [year, month, day] = dateString.split('-');
                const formatted = `${day}/${month}/${year}`;
                console.log('Fecha formateada (directa):', formatted);
                console.log('=== END FORMAT DATE DEBUG ===');
                return formatted;
            }
            
            // Fallback para otros formatos (debe ser mínimo)
            const date = new Date(dateString);
            const formatted = date.toLocaleDateString('es-ES', {
                year: 'numeric',
                month: '2-digit', 
                day: '2-digit'
            });
            console.log('Fallback formateada:', formatted);
            console.log('=== END FORMAT DATE DEBUG ===');
            return formatted;
        } catch (error) {
            console.error('Error formatting date:', dateString, error);
            console.log('=== END FORMAT DATE DEBUG (ERROR) ===');
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

    // Extraer datos del formulario de manera robusta
    extractFormData(form) {
        const data = {};
        
        // Campos de texto, número y select
        const textFields = ['checked_by', 'audit_date', 'build_cell', 'operadores', 'order_number', 'sh', 'qty_of_gc_in_order', 'notes'];
        textFields.forEach(fieldName => {
            const element = form.querySelector(`[name="${fieldName}"]`);
            if (element) {
                data[fieldName] = element.value;
            }
        });
        
        // Debug: Mostrar fecha extraída del formulario
        console.log('extractFormData - Fecha extraída:', data.audit_date);
        console.log('extractFormData - Todos los datos:', data);
        
        // Checkbox - manejo especial
        const checkbox = form.querySelector('[name="errors_found"]');
        if (checkbox) {
            data.errors_found = checkbox.checked;
        }
        
        // Número - manejo especial para gc_with_errors
        const gcWithErrors = form.querySelector('[name="gc_with_errors"]');
        if (gcWithErrors) {
            data.gc_with_errors = gcWithErrors.value;
        }
        
        // Campos de error (selects)
        const errorFields = Object.keys(this.config.ERROR_TYPES || {});
        errorFields.forEach(field => {
            const element = form.querySelector(`[name="${field}_error"]`);
            if (element) {
                data[`${field}_error`] = element.value;
            }
        });
        
        return data;
    }

    // Manejar envío del formulario
async handleFormSubmit(e) {
    e.preventDefault();
    try {
        const form = e.target;
        const data = this.extractFormData(form);

        // 🔒 VALIDACIÓN PERSONALIZADA: Si hay errores y palos con errores, se requiere al menos un tipo de error > 0
        const errorsFound = data.errors_found === true || data.errors_found === 'true' || data.errors_found === 'on';
        const gcWithErrors = parseInt(data.gc_with_errors) || 0;

        if (errorsFound && gcWithErrors > 0) {
            const errorFieldNames = Object.keys(this.config.ERROR_TYPES || {});
            let hasAnyErrorValue = false;

            for (const field of errorFieldNames) {
                const errorValue = parseInt(data[`${field}_error`]) || 0;
                if (errorValue > 0) {
                    hasAnyErrorValue = true;
                    break;
                }
            }

            if (!hasAnyErrorValue) {
                this.showNotification(
                    '⚠️ Debes especificar al menos un tipo de error con valor mayor a 0 si reportaste palos con errores.',
                    'error'
                );
                // Opcional: enfocar la sección de errores
                const errorSection = document.getElementById('errorTypesSection');
                if (errorSection && errorSection.style.display !== 'none') {
                    errorSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
                return;
            }
        }

        // Validar datos (validación general de la API)
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
            this.showNotification(this.config.UI.UPDATE_SUCCESS_MESSAGE, 'success');
        } else {
            await window.auditAPI.createAudit(formattedData);
            this.showNotification(this.config.UI.SAVE_SUCCESS_MESSAGE, 'success');
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
        if (!confirm(this.config.UI.CONFIRM_DELETE_MESSAGE)) {
            return;
        }

        try {
            await window.auditAPI.deleteAudit(auditId);
            this.showNotification(this.config.UI.DELETE_SUCCESS_MESSAGE, 'success');
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
        
        // Resetear a primera página cuando se aplican filtros
        this.currentPage = 1;
        await this.loadAudits();
    }

    // Limpiar filtros
    async clearFilters() {
        document.getElementById('filterAuditor').value = '';
        document.getElementById('filterCell').value = '';
        document.getElementById('filterDate').value = '';
        
        this.filters = {};
        this.currentPage = 1;
        await this.loadAudits();
    }
    
    // Navegar a página específica
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
            this.currentPage = page;
            this.loadAudits();
        }
    }
    
    // Navegar a página anterior
    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.loadAudits();
        }
    }
    
    // Navegar a página siguiente
    nextPage() {
        if (this.currentPage < this.totalPages) {
            this.currentPage++;
            this.loadAudits();
        }
    }
    
    // Renderizar controles de paginación
    renderPagination() {
        const paginationContainer = document.getElementById('paginationContainer');
        if (!paginationContainer) return;
        
        if (this.totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination-controls">';
        
        // Información de página
        paginationHTML += `
            <div class="pagination-info">
                Página ${this.currentPage} de ${this.totalPages} 
                (${this.totalRecords} registros totales)
            </div>
        `;
        
        // Controles de navegación
        paginationHTML += '<div class="pagination-buttons">';
        
        // Botón anterior
        paginationHTML += `
            <button ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="auditApp.previousPage()" 
                    class="pagination-btn">
                <i class="fas fa-chevron-left"></i> Anterior
            </button>
        `;
        
        // Números de página (máximo 5 páginas visibles)
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button ${i === this.currentPage ? 'class="pagination-btn active"' : 'class="pagination-btn"'}
                        onclick="auditApp.goToPage(${i})">
                    ${i}
                </button>
            `;
        }
        
        // Botón siguiente
        paginationHTML += `
            <button ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                    onclick="auditApp.nextPage()" 
                    class="pagination-btn">
                Siguiente <i class="fas fa-chevron-right"></i>
            </button>
        `;
        
        paginationHTML += '</div></div>';
        
        paginationContainer.innerHTML = paginationHTML;
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
    renderStats(audits) {
        const container = document.getElementById('statsData');
        if (!container || !audits || !Array.isArray(audits)) return;
        
        console.log('renderStats - Datos recibidos:', audits.length, 'auditorías');
        console.log('renderStats - Fechas de auditorías:', audits.map(a => a.audit_date).filter(Boolean));
        console.log('renderStats - Fechas DEBUG:', audits.map(a => ({
            id: a.id,
            audit_date: a.audit_date,
            tipo_dato: typeof a.audit_date,
            longitud: a.audit_date ? a.audit_date.length : 'undefined'
        })));
        
        // Mostrar fechas específicas de los primeros 5 registros
        console.log('renderStats - Primeros 5 registros:', audits.slice(0, 5).map(a => ({
            id: a.id,
            audit_date: a.audit_date,
            checked_by: a.checked_by,
            build_cell: a.build_cell
        })));

        // Calcular estadísticas basándose en los datos reales
        const totalAudits = audits.length;
        const auditsWithErrors = audits.filter(audit => audit.errors_found).length;
        const totalErrors = audits.reduce((sum, audit) => sum + (audit.gc_with_errors || 0), 0);
        const auditsWithErrorsPercentage = totalAudits > 0 ? Math.round((auditsWithErrors / totalAudits) * 100) : 0;

        // Agrupar por auditor
        const statsByAuditor = audits.reduce((acc, audit) => {
            const auditor = audit.checked_by || 'Sin asignar';
            acc[auditor] = (acc[auditor] || 0) + 1;
            return acc;
        }, {});

        // Agrupar por celda
        const statsByCell = audits.reduce((acc, audit) => {
            const cell = audit.build_cell || 'Sin asignar';
            acc[cell] = (acc[cell] || 0) + 1;
            return acc;
        }, {});

        // Agrupar por fecha (estadísticas por día)
        console.log('stats - Aplicando corrección de fechas para estadísticas...');
        const statsByDate = audits.reduce((acc, audit) => {
            if (!audit.audit_date) return acc;
            
            // APLICAR LA MISMA CORRECCIÓN que en loadAudits()
            const correctedDate = this.correctDateForTimezone(audit.audit_date);
            
            console.log('stats - Procesando fecha corregida:', correctedDate);
            
            if (!acc[correctedDate]) {
                acc[correctedDate] = { total: 0, errors: 0 };
            }
            acc[correctedDate].total += 1;
            if (audit.errors_found) {
                acc[correctedDate].errors += 1;
            }
            console.log('stats - Estado actual:', acc);
            return acc;
        }, {});

        // CORRECCIÓN: Generar los últimos 7 días correctos desde la fecha actual local
        const currentLocalDate = this.getLocalDateString(); // Fecha local YYYY-MM-DD
        const last7Days = [];
        
        console.log('stats - Fecha actual local:', currentLocalDate);
        
        // Generar los últimos 7 días (incluyendo hoy)
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = this.getLocalDateString(date);
            last7Days.push(dateStr);
            console.log(`stats - Día ${i}:`, dateStr);
        }
        
        // Asegurar que tenemos exactamente 7 días en orden descendente (más reciente primero)
        last7Days.sort().reverse();
        console.log('stats - Últimos 7 días final:', last7Days);
        console.log('stats - statsByDate keys:', Object.keys(statsByDate));
        
        // Calcular estadísticas por día usando fecha local
        const currentDate = this.getLocalDateString(); // Fecha local YYYY-MM-DD
        const yesterdayDate = this.getYesterdayDateString();
        
        const auditsToday = statsByDate[currentDate]?.total || 0;
        const auditsWithErrorsToday = statsByDate[currentDate]?.errors || 0;
        const auditsYesterday = statsByDate[yesterdayDate]?.total || 0;
        const auditsWithErrorsYesterday = statsByDate[yesterdayDate]?.errors || 0;
        
        // Promedio de auditorías por día en los últimos 7 días
        const avgAuditsPerDay = last7Days.length > 0 ? 
            Math.round(last7Days.reduce((sum, date) => sum + (statsByDate[date]?.total || 0), 0) / last7Days.length) : 0;
        
        // Promedio de errores por día en los últimos 7 días
        const avgErrorsPerDay = last7Days.length > 0 ? 
            Math.round(last7Days.reduce((sum, date) => sum + (statsByDate[date]?.errors || 0), 0) / last7Days.length) : 0;

        // Obtener período (rango de fechas)
        const dates = audits.map(audit => audit.audit_date).filter(date => date).sort();
        let period = 'Sin datos de fecha';
        if (dates.length > 0) {
            if (dates.length === 1) {
                period = `Solo: ${dates[0]}`;
            } else {
                // dates[0] es la fecha más antigua, dates[dates.length-1] es la más reciente
                period = `${dates[0]} a ${dates[dates.length - 1]}`;
            }
        }

        container.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-value">${totalAudits}</div>
                    <div class="stat-label">Total Auditorías</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${auditsWithErrors}</div>
                    <div class="stat-label">Con Errores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${totalErrors}</div>
                    <div class="stat-label">Total Errores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${auditsWithErrorsPercentage}%</div>
                    <div class="stat-label">% Con Errores</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${auditsToday}</div>
                    <div class="stat-label">Registros Hoy</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${avgAuditsPerDay}</div>
                    <div class="stat-label">Promedio/Día</div>
                </div>
            </div>
            
            <div class="stats-breakdown">
                <h4>Auditorías por Auditor</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                    ${Object.entries(statsByAuditor).map(([auditor, count]) => `
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
                    ${Object.entries(statsByCell).map(([cell, count]) => `
                        <div style="text-align: center; padding: 1rem; background: white; border-radius: 6px;">
                            <div style="font-size: 1.5rem; font-weight: 700; color: #667eea;">${count}</div>
                            <div style="font-size: 0.875rem; color: #6c757d;">Celda ${cell}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="stats-breakdown" style="margin-top: 1.5rem;">
                <h4>Registros por Día (Últimos 7 días)</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                    ${last7Days.length > 0 ? last7Days.map(date => {
                        const dateData = statsByDate[date] || { total: 0, errors: 0 };
                        console.log(`stats - Mostrando día ${date}:`, dateData);
                        
                        // CORRECCIÓN: Usar formateo seguro para mostrar la fecha correctamente
                        const dateObj = new Date(date + 'T12:00:00');
                        const formattedDate = dateObj.toLocaleDateString('es-ES', { 
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                        });
                        const errorRate = dateData.total > 0 ? Math.round((dateData.errors / dateData.total) * 100) : 0;
                        return `
                            <div style="text-align: center; padding: 1rem; background: white; border-radius: 6px; border-left: 4px solid ${errorRate > 0 ? '#dc3545' : '#28a745'};">
                                <div style="font-size: 1.25rem; font-weight: 700; color: #667eea;">${dateData.total}</div>
                                <div style="font-size: 0.75rem; color: #6c757d; margin: 0.25rem 0;">${formattedDate}</div>
                                <div style="font-size: 0.75rem; color: ${errorRate > 0 ? '#dc3545' : '#28a745'};">
                                    <i class="fas fa-${errorRate > 0 ? 'exclamation-triangle' : 'check-circle'}"></i>
                                    ${dateData.errors} con errores (${errorRate}%)
                                </div>
                            </div>
                        `;
                    }).join('') : `
                        <div style="text-align: center; padding: 2rem; color: #6c757d;">
                            <i class="fas fa-calendar-times" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                            <div>No hay registros para mostrar</div>
                        </div>
                    `}
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 1.5rem; color: #6c757d; font-size: 0.875rem;">
                <i class="fas fa-info-circle"></i> Período: ${period}
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
        const autoHideDelay = this.config && this.config.NOTIFICATIONS 
            ? this.config.NOTIFICATIONS.AUTO_HIDE_DELAY 
            : 5000; // Valor por defecto
        setTimeout(() => {
            this.hideNotification();
        }, autoHideDelay);
    }

    // Ocultar notificación
    hideNotification() {
        const notification = document.getElementById('notification');
        if (notification) {
            notification.classList.remove('show');
        }
    }

    // Exportar datos a Excel
    async exportToExcel() {
        try {
            this.showNotification('Preparando exportación a Excel...', 'info');
            
            // Obtener todos los datos sin límites de paginación
            const allAudits = await window.auditAPI.getAudits(this.filters, 1, 999999);
            
            // Preparar datos para Excel
            const excelData = allAudits.map((audit, index) => {
                // Calcular total de errores
                const errorTypes = [
                    'components_error', 'tipping_error', 'hosel_setting_error', 'shaft_stepping_error',
                    'wood_putter_weights_error', 'club_length_error', 'shaft_alignment_error', 'ferrules_error',
                    'loft_error', 'lie_error', 'grip_alignment_error', 'grip_length_error', 'wraps_error',
                    'swing_weight_error', 'cleanliness_error', 'boxing_error'
                ];
                
                const totalErrors = errorTypes.reduce((sum, errorType) => {
                    return sum + (parseInt(audit[errorType]) || 0);
                }, 0);

                return {
                    'Número': index + 1,
                    'Fecha Auditoría': this.formatDate(audit.audit_date),
                    'Auditor': audit.checked_by,
                    'Celda': audit.build_cell,
                    'Orden': audit.order_number || 'N/A',
                    'SH': audit.sh || 'N/A',
                    'QTY GC': audit.qty_of_gc_in_order || 0,
                    'Errores Encontrados': audit.errors_found ? 'Sí' : 'No',
                    'GC con Errores': audit.gc_with_errors || 0,
                    'Total Errores': totalErrors,
                    'Operadores': audit.operadores || 'N/A',
                    'Notas': audit.notes || 'N/A'
                };
            });

            // Crear worksheet
            const worksheet = XLSX.utils.json_to_sheet(excelData);
            
            // Crear workbook
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Auditorías');
            
            // Ajustar ancho de columnas
            const columnWidths = [
                { wch: 8 },   // Número
                { wch: 15 },  // Fecha
                { wch: 12 },  // Auditor
                { wch: 8 },   // Celda
                { wch: 12 },  // Orden
                { wch: 8 },   // SH
                { wch: 10 },  // QTY GC
                { wch: 12 },  // Errores
                { wch: 12 },  // GC con errores
                { wch: 12 },  // Total errores
                { wch: 15 },  // Operadores
                { wch: 30 }   // Notas
            ];
            worksheet['!cols'] = columnWidths;
            
            // Generar nombre del archivo con fecha actual
            let todayStr = this.getLocalDateString(); // Usar función auxiliar para fecha local
            const filename = `Auditorias_Golf_${todayStr}.xlsx`;
            
            // Descargar archivo
            XLSX.writeFile(workbook, filename);
            
            this.showNotification(`Excel exportado exitosamente (${excelData.length} registros)`, 'success');
            
        } catch (error) {
            console.error('Error exportando a Excel:', error);
            this.showNotification('Error al exportar a Excel', 'error');
        }
    }

    // Exportar datos a PDF
    async exportToPDF() {
        try {
            this.showNotification('Preparando exportación a PDF...', 'info');
            
            // Obtener todos los datos sin límites de paginación
            const allAudits = await window.auditAPI.getAudits(this.filters, 1, 999999);
            
            // Crear documento PDF
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });
            
            // Configurar fuente y tamaño
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(16);
            
            // Título del documento
            doc.text('Sistema de Auditoría de Golf', 148, 20, { align: 'center' });
            
            // Fecha de generación
            let todayObj = new Date();
            doc.setFontSize(10);
            doc.text(`Generado el: ${todayObj.toLocaleDateString('es-ES')} a las ${todayObj.toLocaleTimeString('es-ES')}`, 148, 30, { align: 'center' });
            
            // Información de filtros aplicados
            let filterInfo = 'Sin filtros aplicados';
            if (Object.keys(this.filters).length > 0) {
                const filters = [];
                if (this.filters.checked_by) filters.push(`Auditor: ${this.filters.checked_by}`);
                if (this.filters.build_cell) filters.push(`Celda: ${this.filters.build_cell}`);
                if (this.filters.audit_date) filters.push(`Fecha desde: ${this.filters.audit_date}`);
                filterInfo = filters.join(' | ');
            }
            doc.text(filterInfo, 148, 37, { align: 'center' });
            
            // Preparar datos para la tabla
            const tableData = allAudits.map((audit, index) => {
                // Calcular total de errores
                const errorTypes = [
                    'components_error', 'tipping_error', 'hosel_setting_error', 'shaft_stepping_error',
                    'wood_putter_weights_error', 'club_length_error', 'shaft_alignment_error', 'ferrules_error',
                    'loft_error', 'lie_error', 'grip_alignment_error', 'grip_length_error', 'wraps_error',
                    'swing_weight_error', 'cleanliness_error', 'boxing_error'
                ];
                
                const totalErrors = errorTypes.reduce((sum, errorType) => {
                    return sum + (parseInt(audit[errorType]) || 0);
                }, 0);

                return [
                    (index + 1).toString(),
                    this.formatDate(audit.audit_date),
                    audit.checked_by,
                    audit.build_cell,
                    audit.order_number || 'N/A',
                    audit.sh || 'N/A',
                    (audit.qty_of_gc_in_order || 0).toString(),
                    audit.errors_found ? 'Sí' : 'No',
                    (audit.gc_with_errors || 0).toString(),
                    totalErrors.toString()
                ];
            });
            
            // Configurar tabla
            const tableHeaders = ['N°', 'Fecha', 'Auditor', 'Celda', 'Orden', 'SH', 'QTY GC', 'Errores', 'GC Errores', 'Total Err'];
            
            // Generar tabla
            doc.autoTable({
                head: [tableHeaders],
                body: tableData,
                startY: 45,
                styles: {
                    fontSize: 8,
                    cellPadding: 2
                },
                headStyles: {
                    fillColor: [102, 126, 234],
                    textColor: 255,
                    fontSize: 9,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                columnStyles: {
                    0: { cellWidth: 12 }, // N°
                    1: { cellWidth: 20 }, // Fecha
                    2: { cellWidth: 20 }, // Auditor
                    3: { cellWidth: 15 }, // Celda
                    4: { cellWidth: 25 }, // Orden
                    5: { cellWidth: 15 }, // SH
                    6: { cellWidth: 15 }, // QTY GC
                    7: { cellWidth: 15 }, // Errores
                    8: { cellWidth: 18 }, // GC Errores
                    9: { cellWidth: 18 }  // Total Err
                },
                margin: { top: 45, right: 10, bottom: 10, left: 10 },
                didDrawPage: (data) => {
                    // Pie de página
                    const pageSize = doc.internal.pageSize;
                    const pageHeight = pageSize.height || pageSize.getHeight();
                    doc.setFontSize(8);
                    doc.text(`Página ${doc.internal.getNumberOfPages()}`, data.settings.margin.left, pageHeight - 10);
                    doc.text(`${tableData.length} registros totales`, pageSize.width - data.settings.margin.right - 20, pageHeight - 10);
                }
            });
            
            // Generar nombre del archivo con fecha actual
            let todayPdfStr = this.getLocalDateString(); // Usar función auxiliar para fecha local
            const filename = `Auditorias_Golf_${todayPdfStr}.pdf`;
            
            // Descargar archivo
            doc.save(filename);
            
            this.showNotification(`PDF exportado exitosamente (${tableData.length} registros)`, 'success');
            
        } catch (error) {
            console.error('Error exportando a PDF:', error);
            this.showNotification('Error al exportar a PDF', 'error');
        }
    }
}

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.auditApp = new AuditApp();
});
