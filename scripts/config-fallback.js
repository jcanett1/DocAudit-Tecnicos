// Configuración de respaldo en caso de que config.js no se cargue
window.CONFIG = window.CONFIG || {
    // Configuración de Supabase
    SUPABASE_URL: 'https://hckbtzbcmijdstyazwoz.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhja2J0emJjbWlqZHN0eWF6d296Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1MDU4MDcsImV4cCI6MjA2NTA4MTgwN30.JfYJwuytLNXY42QcfjdilP4btvKu17gr84dbUQ_nMBk',
    
    // URL del API usando Supabase
    API_BASE_URL: 'https://hckbtzbcmijdstyazwoz.supabase.co/rest/v1',
    
    // Configuración de la aplicación
    APP_NAME: 'Sistema de Auditoría de Golf',
    VERSION: '1.0.0',
    
    // Configuración de fecha
    DATE_FORMAT: 'YYYY-MM-DD',
    
    // Opciones predefinidas
    AUDITORS: ['Karla', 'Adrián', 'Carmen'],
    BUILD_CELLS: ['5', '10', '11', '15', '16', 'kiteo', 'otras'],
    ERROR_LEVELS: [0, 1, 2, 3, 4],
    
    // Configuración de paginación
    PAGINATION: {
        DEFAULT_PAGE_SIZE: 50,
        MAX_PAGE_SIZE: 100
    },
    
    // Configuración de notificaciones
    NOTIFICATIONS: {
        AUTO_HIDE_DELAY: 5000, // 5 segundos
        POSITION: 'top-right'
    },
    
    // Configuración de validación
    VALIDATION: {
        REQUIRED_FIELDS: [
            'checked_by',
            'audit_date',
            'build_cell',
            'errors_found'
        ],
        MAX_NOTES_LENGTH: 1000,
        MIN_GC_WITH_ERRORS: 0,
        MAX_GC_WITH_ERRORS: 9999
    },
    
    // Configuración de la UI
    UI: {
        LOADING_MESSAGE: 'Cargando auditorías...',
        NO_DATA_MESSAGE: 'No se encontraron auditorías',
        SUCCESS_MESSAGE: 'Operación realizada exitosamente',
        ERROR_MESSAGE: 'Ha ocurrido un error',
        CONFIRM_DELETE_MESSAGE: '¿Está seguro que desea eliminar esta auditoría?',
        SAVE_SUCCESS_MESSAGE: 'Auditoría guardada exitosamente',
        UPDATE_SUCCESS_MESSAGE: 'Auditoría actualizada exitosamente',
        DELETE_SUCCESS_MESSAGE: 'Auditoría eliminada exitosamente'
    },
    
    // Configuración de tipos de errores
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

console.log('Fallback CONFIG loaded:', window.CONFIG);