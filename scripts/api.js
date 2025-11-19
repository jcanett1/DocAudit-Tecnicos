// Clase para manejar la API
class AuditAPI {
    constructor() {
        this.baseURL = window.CONFIG.API_BASE_URL;
        this.endpoints = {
            audits: '/api/audits',
            audit: (id) => `/api/audits/${id}`,
            stats: '/api/stats',
            health: '/health'
        };
    }

    // Función auxiliar para hacer peticiones
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const config = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            },
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Obtener todas las auditorías
    async getAudits(filters = {}) {
        try {
            let queryString = '';
            const params = new URLSearchParams();

            // Agregar filtros como parámetros de consulta
            Object.keys(filters).forEach(key => {
                if (filters[key] && filters[key] !== '') {
                    params.append(key, filters[key]);
                }
            });

            if (params.toString()) {
                queryString = `?${params.toString()}`;
            }

            const response = await this.request(`${this.endpoints.audits}${queryString}`);
            return response.data || [];
        } catch (error) {
            throw new Error(`Error al obtener auditorías: ${error.message}`);
        }
    }

    // Obtener una auditoría por ID
    async getAudit(id) {
        try {
            const response = await this.request(this.endpoints.audit(id));
            return response.data;
        } catch (error) {
            throw new Error(`Error al obtener auditoría: ${error.message}`);
        }
    }

    // Crear nueva auditoría
    async createAudit(auditData) {
        try {
            const response = await this.request(this.endpoints.audits, {
                method: 'POST',
                body: JSON.stringify(auditData),
            });
            return response.data;
        } catch (error) {
            throw new Error(`Error al crear auditoría: ${error.message}`);
        }
    }

    // Actualizar auditoría
    async updateAudit(id, auditData) {
        try {
            const response = await this.request(this.endpoints.audit(id), {
                method: 'PUT',
                body: JSON.stringify(auditData),
            });
            return response.data;
        } catch (error) {
            throw new Error(`Error al actualizar auditoría: ${error.message}`);
        }
    }

    // Eliminar auditoría
    async deleteAudit(id) {
        try {
            const response = await this.request(this.endpoints.audit(id), {
                method: 'DELETE',
            });
            return response;
        } catch (error) {
            throw new Error(`Error al eliminar auditoría: ${error.message}`);
        }
    }

    // Obtener estadísticas
    async getStats() {
        try {
            const response = await this.request(this.endpoints.stats);
            return response.data;
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }

    // Verificar salud del servicio
    async healthCheck() {
        try {
            const response = await this.request(this.endpoints.health);
            return response.status === 'OK';
        } catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }

    // Validar datos antes de enviar
    validateAuditData(data) {
        const requiredFields = window.CONFIG.VALIDATION.REQUIRED_FIELDS;
        const errors = [];

        // Verificar campos requeridos
        requiredFields.forEach(field => {
            if (!data[field] && data[field] !== false) {
                errors.push(`El campo ${field} es requerido`);
            }
        });

        // Validar auditor
        if (data.checked_by && !window.CONFIG.AUDITORS.includes(data.checked_by)) {
            errors.push('Auditor inválido');
        }

        // Validar celda de construcción
        if (data.build_cell && !window.CONFIG.BUILD_CELLS.includes(data.build_cell)) {
            errors.push('Celda de construcción inválida');
        }

        // Validar fecha
        if (data.audit_date && isNaN(Date.parse(data.audit_date))) {
            errors.push('Fecha de auditoría inválida');
        }

        // Validar GC con errores
        if (data.gc_with_errors !== undefined) {
            const gcErrors = parseInt(data.gc_with_errors);
            if (isNaN(gcErrors) || gcErrors < 0) {
                errors.push('GC con errores debe ser un número positivo');
            }
        }

        // Validar cantidad de GC en orden
        if (data.qty_of_gc_in_order !== undefined && data.qty_of_gc_in_order !== '') {
            const qty = parseInt(data.qty_of_gc_in_order);
            if (isNaN(qty) || qty < 0) {
                errors.push('QTY of GC in order debe ser un número positivo');
            }
        }

        // Validar longitud de notas
        if (data.notes && data.notes.length > window.CONFIG.VALIDATION.MAX_NOTES_LENGTH) {
            errors.push(`Las notas no pueden exceder ${window.CONFIG.VALIDATION.MAX_NOTES_LENGTH} caracteres`);
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    // Formatear datos para el formulario
    formatAuditForForm(audit) {
        return {
            checked_by: audit.checked_by || '',
            audit_date: audit.audit_date || '',
            build_cell: audit.build_cell || '',
            operadores: audit.operadores || '',
            order_number: audit.order_number || '',
            sh: audit.sh || '',
            qty_of_gc_in_order: audit.qty_of_gc_in_order || '',
            errors_found: audit.errors_found || false,
            gc_with_errors: audit.gc_with_errors || '',
            components_error: audit.components_error || 0,
            tipping_error: audit.tipping_error || 0,
            hosel_setting_error: audit.hosel_setting_error || 0,
            shaft_stepping_error: audit.shaft_stepping_error || 0,
            wood_putter_weights_error: audit.wood_putter_weights_error || 0,
            club_length_error: audit.club_length_error || 0,
            shaft_alignment_error: audit.shaft_alignment_error || 0,
            ferrules_error: audit.ferrules_error || 0,
            loft_error: audit.loft_error || 0,
            lie_error: audit.lie_error || 0,
            grip_alignment_error: audit.grip_alignment_error || 0,
            grip_length_error: audit.grip_length_error || 0,
            wraps_error: audit.wraps_error || 0,
            swing_weight_error: audit.swing_weight_error || 0,
            cleanliness_error: audit.cleanliness_error || 0,
            boxing_error: audit.boxing_error || 0,
            notes: audit.notes || ''
        };
    }

    // Formatear datos del formulario para la API
    formatFormData(formData) {
        const data = {};
        
        // Campos básicos
        data.checked_by = formData.checked_by;
        data.audit_date = formData.audit_date;
        data.build_cell = formData.build_cell;
        data.operadores = formData.operadores;
        data.order_number = formData.order_number;
        data.sh = formData.sh;
        data.qty_of_gc_in_order = formData.qty_of_gc_in_order ? parseInt(formData.qty_of_gc_in_order) : null;
        data.errors_found = formData.errors_found === 'true' || formData.errors_found === true;
        data.gc_with_errors = formData.gc_with_errors ? parseInt(formData.gc_with_errors) : null;
        data.notes = formData.notes;

        // Campos de error
        const errorFields = Object.keys(window.CONFIG.ERROR_TYPES);
        errorFields.forEach(field => {
            const formField = `${field}_error`;
            data[formField] = formData[formField] ? parseInt(formData[formField]) : 0;
        });

        return data;
    }
}

// Crear instancia global de la API
window.auditAPI = new AuditAPI();