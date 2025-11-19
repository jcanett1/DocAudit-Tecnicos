# Sistema de Auditoría de Golf - Full Stack

Una aplicación web completa para gestionar auditorías de equipos de golf con frontend moderno y backend robusto.

## 🏌️ Características

- **Frontend Moderno**: Interfaz responsiva con HTML5, CSS3 y JavaScript vanilla
- **Backend Robusto**: API REST con Node.js, Express y Supabase
- **Base de Datos**: Supabase PostgreSQL con Row Level Security
- **Características Principales**:
  - Gestión completa de auditorías (CRUD)
  - Filtros avanzados por auditor, celda y fecha
  - Sistema de tipos de errores con escala 0-4
  - Estadísticas en tiempo real
  - Notificaciones en tiempo real
  - Diseño responsivo y moderno

## 🏗️ Arquitectura

```
├── audit-golf-app/
│   ├── backend/           # API REST con Node.js + Express
│   │   ├── server.js
│   │   ├── package.json
│   │   └── .env.example
│   ├── frontend/          # Aplicación web
│   │   ├── index.html
│   │   ├── styles/
│   │   │   └── main.css
│   │   └── scripts/
│   │       ├── config.js
│   │       ├── api.js
│   │       └── app.js
│   ├── database/          # Esquemas y scripts SQL
│   │   └── supabase_schema.sql
│   └── docs/             # Documentación
│       └── README.md
```

## 🚀 Instalación y Configuración

### 1. Configuración de Supabase

1. **Crear Proyecto en Supabase**:
   - Ve a [supabase.com](https://supabase.com)
   - Crea una cuenta o inicia sesión
   - Crea un nuevo proyecto
   - Anota la URL y la Anon Key del proyecto

2. **Crear la Tabla**:
   - Ve al SQL Editor en tu proyecto de Supabase
   - Ejecuta el contenido de `database/supabase_schema.sql`
   - Esto creará la tabla `dotaudit` con todas las validaciones necesarias

### 2. Configuración del Backend

1. **Instalar Dependencias**:
   ```bash
   cd audit-golf-app/backend
   npm install
   ```

2. **Configurar Variables de Entorno**:
   ```bash
   cp .env.example .env
   ```
   
   Edita el archivo `.env` y configura:
   ```env
   PORT=3001
   SUPABASE_URL=https://tu-proyecto.supabase.co
   SUPABASE_ANON_KEY=tu-anon-key
   ALLOWED_ORIGINS=http://localhost:3000
   NODE_ENV=development
   ```

3. **Iniciar el Servidor**:
   ```bash
   npm start
   # o para desarrollo:
   npm run dev
   ```

### 3. Configuración del Frontend

1. **Configurar URL del API**:
   - Edita `frontend/scripts/config.js`
   - Cambia `API_BASE_URL` por la URL de tu backend

2. **Desplegar en GitHub**:
   - Crea un repositorio en GitHub
   - Sube todos los archivos del directorio `frontend/`
   - Habilita GitHub Pages en la configuración del repositorio

## 📊 Esquema de Base de Datos

### Tabla `dotaudit`

| Campo | Tipo | Restricciones | Descripción |
|-------|------|---------------|-------------|
| `id` | UUID | Primary Key | Identificador único |
| `checked_by` | VARCHAR(50) | Karla, Adrián, Carmen | Auditor que revisó |
| `audit_date` | DATE | NOT NULL | Fecha de auditoría |
| `build_cell` | VARCHAR(20) | 5,10,11,15,16,kiteo,otras | Número de celda |
| `operadores` | VARCHAR(100) | | Nombres de operadores |
| `order_number` | VARCHAR(50) | | Número de orden |
| `sh` | VARCHAR(20) | | Código SH |
| `qty_of_gc_in_order` | INTEGER | | Cantidad de GC en orden |
| `errors_found` | BOOLEAN | NOT NULL | ¿Se encontraron errores? |
| `gc_with_errors` | INTEGER | | GC con errores |
| `*_error` | INTEGER (16 campos) | 0-4 | Tipos de errores |
| `notes` | TEXT | | Notas adicionales |

### Tipos de Errores (Escala 0-4)

- **0**: Sin errores
- **1**: Error menor
- **2**: Error moderado
- **3**: Error grave
- **4**: Error crítico

1. Components
2. Tipping
3. Hosel Setting
4. Shaft Stepping
5. Wood/Putter Weights
6. Club Length
7. Shaft Alignment
8. Ferrules
9. Loft
10. Lie
11. Grip Alignment
12. Grip Length
13. Wraps
14. Swing Weight
15. Cleanliness
16. Boxing

## 🔌 API Endpoints

### Auditorías

- `GET /api/audits` - Obtener todas las auditorías
- `GET /api/audits/:id` - Obtener una auditoría específica
- `POST /api/audits` - Crear nueva auditoría
- `PUT /api/audits/:id` - Actualizar auditoría
- `DELETE /api/audits/:id` - Eliminar auditoría

### Estadísticas

- `GET /api/stats` - Obtener estadísticas del último mes

### Sistema

- `GET /health` - Health check del servicio

## 🎨 Interfaz de Usuario

### Características del Frontend

1. **Diseño Moderno**:
   - Gradientes y efectos de vidrio (glassmorphism)
   - Tipografía Inter para legibilidad óptima
   - Iconos Font Awesome
   - Animaciones suaves

2. **Funcionalidades**:
   - Formulario modal para crear/editar auditorías
   - Filtros dinámicos por auditor, celda y fecha
   - Tabla responsive con acciones (editar/eliminar)
   - Notificaciones toast
   - Modal de estadísticas
   - Carga dinámica de datos

3. **Responsividad**:
   - Diseño adaptativo para móviles
   - Tabla con scroll horizontal
   - Formularios optimizados para pantallas pequeñas

## 🔒 Seguridad

- **Row Level Security (RLS)** en Supabase
- **Validación en Backend** con express-validator
- **Rate Limiting** para prevenir abuso
- **CORS configurado** para seguridad cross-origin
- **Helmet.js** para headers de seguridad
- **Validación de entrada** tanto en frontend como backend

## 📈 Monitoreo y Estadísticas

El sistema incluye:
- Total de auditorías
- Auditorías con errores
- Porcentaje de errores
- Distribución por auditor
- Distribución por celda
- Datos del último mes

## 🛠️ Desarrollo

### Scripts Disponibles

```bash
# Backend
npm start          # Iniciar servidor
npm run dev        # Iniciar con nodemon (desarrollo)

# Frontend (configurar según tu servidor)
# El frontend es una SPA que se sirve estáticamente
```

### Estructura de Archivos

```
audit-golf-app/
├── backend/
│   ├── server.js           # Servidor principal
│   ├── package.json        # Dependencias Node.js
│   └── .env.example        # Ejemplo de variables de entorno
├── frontend/
│   ├── index.html          # Página principal
│   ├── styles/
│   │   └── main.css        # Estilos principales
│   └── scripts/
│       ├── config.js       # Configuración de la app
│       ├── api.js          # Cliente API
│       └── app.js          # Lógica de la aplicación
├── database/
│   └── supabase_schema.sql # Esquema de base de datos
└── docs/
    └── README.md           # Esta documentación
```

## 🚦 Despliegue en Producción

### Backend (Supabase)

1. **Supabase** ya es un servicio cloud, no necesitas desplegar el backend
2. El backend Node.js es opcional - puedes usar directamente Supabase REST API

### Frontend (GitHub Pages)

1. **GitHub Pages**:
   ```bash
   # 1. Crear repositorio en GitHub
   # 2. Subir archivos del frontend/
   # 3. Habilitar GitHub Pages en Settings > Pages
   # 4. Seleccionar branch y carpeta (generalmente root)
   ```

2. **Configurar URL del API**:
   - Actualiza `API_BASE_URL` en `config.js`
   - Usa la URL de tu backend o Supabase directamente

### Variables de Entorno en Producción

```env
# Backend
NODE_ENV=production
SUPABASE_URL=tu-prod-url
SUPABASE_ANON_KEY=tu-prod-key
ALLOWED_ORIGINS=https://tu-dominio.github.io
```

## 🔧 Configuración Avanzada

### Supabase Client (Opcional)

Si prefieres usar Supabase directamente desde el frontend:

```javascript
// En lugar del backend Node.js
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://tu-proyecto.supabase.co',
  'tu-anon-key'
)

// Usar directamente desde el frontend
const { data } = await supabase
  .from('dotaudit')
  .select('*')
```

### Customización de Validaciones

Editar `backend/server.js` para:
- Agregar más validaciones
- Cambiar tipos de errores
- Modificar campos requeridos
- Personalizar mensajes de error

### Estilos Personalizados

Modificar `frontend/styles/main.css` para:
- Cambiar colores y tema
- Agregar nuevas animaciones
- Personalizar componentes
- Ajustar responsividad

## 📞 Soporte

Para preguntas o problemas:

1. **Verifica la configuración**:
   - URL de Supabase correcta
   - Variables de entorno configuradas
   - Tabla creada correctamente

2. **Logs del sistema**:
   - Consola del navegador (Frontend)
   - Logs del servidor Node.js (Backend)
   - Dashboard de Supabase (Base de datos)

3. **Health Check**:
   - GET `/health` - Verificar que el backend funciona
   - Consola del navegador para errores de red

## 📋 Changelog

### Versión 1.0.0
- ✅ Sistema completo de auditoría
- ✅ CRUD de auditorías
- ✅ Filtros y búsqueda
- ✅ Estadísticas
- ✅ Diseño responsivo
- ✅ Validaciones completas
- ✅ Documentación completa

---

**Desarrollado por**: MiniMax Agent  
**Versión**: 1.0.0  
**Licencia**: MIT