// Clase para manejar la API
class AuditAPI {
    constructor() {
        this.config = this.getConfig();
        this.baseURL = this.config.API_BASE_URL;
        this.supabaseURL = this.config.SUPABASE_URL;
        this.supabaseKey = this.config.SUPABASE_ANON_KEY;
        this.tableName = 'docaudit';
        this.endpoints = {
            audits: `/rest/v1/${this.tableName}`,
            audit: (id) => `/rest/v1/${this.tableName}?id=eq.${id}`,
            stats: `/rest/v1/${this.tableName}?select=*`
        };
        
        console.log('🔧 API Constructor - Config loaded:', {
            supabaseURL: this.supabaseURL,
            supabaseKey: this.supabaseKey ? `${this.supabaseKey.substring(0, 20)}...` : 'undefined',
            tableName: this.tableName,
            endpoints: this.endpoints
        });
    }

    // Obtener configuración de forma segura
    getConfig() {
        const defaultConfig = {
            SUPABASE_URL: 'https://hckbtzbcmijdstyazwoz.supabase.co',
            SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja2J0emJjbWlqZHN0eWF6d296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MDU4MDcsImV4cCI6MjA2NTA4MTgwN30.JfYJwuytLNXY42QcfjdilP4btvKu17gr84dbUQ_nMBk',
            API_BASE_URL: 'https://hckbtzbcmijdstyazwoz.supabase.co/rest/v1',
            VALIDATION: {
                REQUIRED_FIELDS: ['checked_by', 'audit_date', 'build_cell', 'errors_found'],
                MAX_NOTES_LENGTH: 1000
            },
            AUDITORS: ['Karla', 'Adrián', 'Carmen'],
            BUILD_CELLS: ['5', '10', '11', '15', '16', 'kiteo', 'otras'],
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

    // Función auxiliar para hacer peticiones
    async request(endpoint, options = {}) {
        console.log('🔍 Debug API Request:', {
            supabaseURL: this.supabaseURL,
            supabaseKey: this.supabaseKey ? `${this.supabaseKey.substring(0, 20)}...` : 'undefined',
            endpoint: endpoint,
            configAvailable: !!this.config
        });
        
        const url = `${this.supabaseURL}${endpoint}`;
        console.log('🔗 Full URL:', url);
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                'apikey': this.supabaseKey,
                'Authorization': `Bearer ${this.supabaseKey}`
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
            return response || [];
        } catch (error) {
            throw new Error(`Error al obtener auditorías: ${error.message}`);
        }
    }

    // Obtener una auditoría por ID
    async getAudit(id) {
        try {
            const response = await this.request(this.endpoints.audit(id));
            return response && response[0] ? response[0] : null;
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
            return response;
        } catch (error) {
            throw new Error(`Error al crear auditoría: ${error.message}`);
        }
    }

    // Actualizar auditoría
    async updateAudit(id, auditData) {
        try {
            const response = await this.request(this.endpoints.audit(id), {
                method: 'PATCH',
                body: JSON.stringify(auditData),
            });
            return response;
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
            return response[0] || response;
        } catch (error) {
            throw new Error(`Error al eliminar auditoría: ${error.message}`);
        }
    }

    // Obtener estadísticas
    async getStats() {
        try {
            const response = await this.request(this.endpoints.stats);
            return response;
        } catch (error) {
            throw new Error(`Error al obtener estadísticas: ${error.message}`);
        }
    }



    // Validar datos antes de enviar
    validateAuditData(data) {
        const requiredFields = this.config.VALIDATION.REQUIRED_FIELDS;
        const errors = [];

        // Verificar campos requeridos
        requiredFields.forEach(field => {
            const value = data[field];
            
            // Manejar campos de checkbox (errors_found)
            if (field === 'errors_found') {
                // Los checkboxes siempre tienen un valor (true/false), no es undefined
                if (value === undefined || value === null) {
                    errors.push(`El campo ${field} es requerido`);
                }
            } else {
                // Para otros campos, verificar que no estén vacíos
                if (!value && value !== 0 && value !== false) {
                    errors.push(`El campo ${field} es requerido`);
                }
            }
        });

        // Validar auditor
        if (data.checked_by && !this.config.AUDITORS.includes(data.checked_by)) {
            errors.push('Auditor inválido');
        }

        // Validar celda de construcción
        if (data.build_cell && !this.config.BUILD_CELLS.includes(data.build_cell)) {
            errors.push('Celda de construcción inválida');
        }

        // Validar fecha
        if (data.audit_date && isNaN(Date.parse(data.audit_date))) {
            errors.push('Fecha de auditoría inválida');
        }

        // Validar GC con errores
        if (data.gc_with_errors !== undefined && data.gc_with_errors !== null && data.gc_with_errors !== '') {
            const gcErrors = parseInt(data.gc_with_errors);
            if (isNaN(gcErrors) || gcErrors < 0) {
                errors.push('GC con errores debe ser un número igual o mayor a 0');
            }
        } else {
            // Si no se especifica, asumir 0 errores
            data.gc_with_errors = 0;
        }

        // Validar cantidad de GC en orden
        if (data.qty_of_gc_in_order !== undefined && data.qty_of_gc_in_order !== '') {
            const qty = parseInt(data.qty_of_gc_in_order);
            if (isNaN(qty) || qty < 0) {
                errors.push('QTY of GC in order debe ser un número positivo');
            }
        }

        // Validar longitud de notas
        if (data.notes && data.notes.length > this.config.VALIDATION.MAX_NOTES_LENGTH) {
            errors.push(`Las notas no pueden exceder ${this.config.VALIDATION.MAX_NOTES_LENGTH} caracteres`);
        }

        // Validar que si hay errores, se especifiquen al menos algunos tipos de error
        if (data.errors_found) {
            const errorFields = Object.keys(this.config.ERROR_TYPES);
            let hasErrors = false;
            
            errorFields.forEach(field => {
                const formField = `${field}_error`;
                if (data[formField] && data[formField] > 0) {
                    hasErrors = true;
                }
            });
            
            if (!hasErrors) {
                errors.push('Si se encontraron errores, debe especificar al menos un tipo de error');
            }
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
        data.errors_found = formData.errors_found === true || 
                          formData.errors_found === 'true' || 
                          formData.errors_found === 'on' || 
                          formData.errors_found === 1 || 
                          formData.errors_found === '1';
        
        // Si errors_found es true, gc_with_errors debe ser al menos 1
        if (data.errors_found && data.gc_with_errors === 0) {
            data.gc_with_errors = 1; // Si hay errores, debe haber al menos 1 palo con error
        }
        
        // Asegurar que gc_with_errors sea un número válido
        if (data.errors_found && data.gc_with_errors < 1) {
            data.gc_with_errors = 1;
        }
        data.gc_with_errors = formData.gc_with_errors !== undefined && formData.gc_with_errors !== '' 
                            ? parseInt(formData.gc_with_errors) 
                            : 0;
        data.notes = formData.notes;

        // Campos de error
        const errorFields = Object.keys(this.config.ERROR_TYPES);
        errorFields.forEach(field => {
            const formField = `${field}_error`;
            data[formField] = formData[formField] ? parseInt(formData[formField]) : 0;
        });

        return data;
    }
}

// Crear instancia global de la API
window.auditAPI = new AuditAPI();
