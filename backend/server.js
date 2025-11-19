const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Configurar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware de seguridad
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutos
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // límite por IP
  message: 'Demasiadas solicitudes desde esta IP, intenta nuevamente más tarde.'
});
app.use('/api/', limiter);

// CORS
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Configuración de headers para debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// ===========================================
// RUTAS PARA AUDITORÍAS
// ===========================================

// Validaciones
const auditValidation = [
  body('checked_by').isIn(['Karla', 'Adrián', 'Carmen']).withMessage('Auditor inválido'),
  body('audit_date').isISO8601().withMessage('Fecha de auditoría inválida'),
  body('build_cell').isIn(['5', '10', '11', '15', '16', 'kiteo', 'otras']).withMessage('Celda inválida'),
  body('errors_found').isBoolean().withMessage('El campo errors_found debe ser booleano'),
  body('gc_with_errors').optional().isInt({ min: 0 }).withMessage('GC con errores debe ser un número positivo'),
  // Validar todos los campos de error (0-4)
  'components_error', 'tipping_error', 'hosel_setting_error', 'shaft_stepping_error',
  'wood_putter_weights_error', 'club_length_error', 'shaft_alignment_error', 'ferrules_error',
  'loft_error', 'lie_error', 'grip_alignment_error', 'grip_length_error', 'wraps_error',
  'swing_weight_error', 'cleanliness_error', 'boxing_error'
].forEach(field => {
  app.use(express.json()); // Re-añadir middleware
});

// GET - Obtener todas las auditorías
app.get('/api/audits', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('dotaudit')
      .select('*')
      .order('audit_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error en Supabase:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({
      success: true,
      data: data || [],
      total: data?.length || 0
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error inesperado del servidor' });
  }
});

// GET - Obtener una auditoría por ID
app.get('/api/audits/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('dotaudit')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Auditoría no encontrada' });
      }
      console.error('Error en Supabase:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error inesperado del servidor' });
  }
});

// POST - Crear nueva auditoría
app.post('/api/audits', 
  auditValidation,
  async (req, res) => {
    try {
      // Verificar validación
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos', 
          details: errors.array() 
        });
      }

      const auditData = req.body;

      const { data, error } = await supabase
        .from('dotaudit')
        .insert([auditData])
        .select()
        .single();

      if (error) {
        console.error('Error en Supabase:', error);
        return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
      }

      res.status(201).json({
        success: true,
        message: 'Auditoría creada exitosamente',
        data: data
      });
    } catch (error) {
      console.error('Error inesperado:', error);
      res.status(500).json({ error: 'Error inesperado del servidor' });
    }
  }
);

// PUT - Actualizar auditoría
app.put('/api/audits/:id',
  auditValidation,
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          error: 'Datos inválidos', 
          details: errors.array() 
        });
      }

      const { id } = req.params;
      const updateData = req.body;

      const { data, error } = await supabase
        .from('dotaudit')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: 'Auditoría no encontrada' });
        }
        console.error('Error en Supabase:', error);
        return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
      }

      res.json({
        success: true,
        message: 'Auditoría actualizada exitosamente',
        data: data
      });
    } catch (error) {
      console.error('Error inesperado:', error);
      res.status(500).json({ error: 'Error inesperado del servidor' });
    }
  }
);

// DELETE - Eliminar auditoría
app.delete('/api/audits/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('dotaudit')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error en Supabase:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    res.json({
      success: true,
      message: 'Auditoría eliminada exitosamente'
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error inesperado del servidor' });
  }
});

// GET - Obtener estadísticas
app.get('/api/stats', async (req, res) => {
  try {
    // Obtener auditorías del último mes
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const { data, error } = await supabase
      .from('dotaudit')
      .select('*')
      .gte('audit_date', lastMonth.toISOString().split('T')[0]);

    if (error) {
      console.error('Error en Supabase:', error);
      return res.status(500).json({ error: 'Error interno del servidor', details: error.message });
    }

    // Calcular estadísticas
    const totalAudits = data?.length || 0;
    const auditsWithErrors = data?.filter(audit => audit.errors_found).length || 0;
    const totalErrors = data?.reduce((sum, audit) => sum + (audit.gc_with_errors || 0), 0) || 0;

    const statsByAuditor = data?.reduce((acc, audit) => {
      acc[audit.checked_by] = (acc[audit.checked_by] || 0) + 1;
      return acc;
    }, {}) || {};

    const statsByCell = data?.reduce((acc, audit) => {
      acc[audit.build_cell] = (acc[audit.build_cell] || 0) + 1;
      return acc;
    }, {}) || {};

    res.json({
      success: true,
      data: {
        totalAudits,
        auditsWithErrors,
        totalErrors,
        auditsWithErrorsPercentage: totalAudits > 0 ? Math.round((auditsWithErrors / totalAudits) * 100) : 0,
        statsByAuditor,
        statsByCell,
        period: 'Último mes'
      }
    });
  } catch (error) {
    console.error('Error inesperado:', error);
    res.status(500).json({ error: 'Error inesperado del servidor' });
  }
});

// Ruta de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    service: 'Audit Golf Backend'
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
  console.log(`📊 API disponible en http://localhost:${PORT}/api`);
  console.log(`🏥 Health check en http://localhost:${PORT}/health`);
});

module.exports = app;