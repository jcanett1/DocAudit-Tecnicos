# Guía Rápida de Despliegue

## 🚀 Pasos para Implementar el Sistema

### 1. Configurar Supabase (5 minutos)

1. Crear cuenta en [supabase.com](https://supabase.com)
2. Crear nuevo proyecto
3. Copiar URL del proyecto y Anon Key
4. Ejecutar SQL del archivo `database/supabase_schema.sql`

### 2. Configurar Backend (5 minutos)

```bash
# 1. Instalar dependencias
cd audit-golf-app/backend
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus datos de Supabase

# 3. Iniciar servidor
npm start
```

### 3. Desplegar Frontend en GitHub (10 minutos)

```bash
# 1. Crear repositorio en GitHub
# 2. Subir archivos del frontend/ a tu repositorio
# 3. Editar frontend/scripts/config.js
#    Cambiar API_BASE_URL por URL de tu backend
# 4. Habilitar GitHub Pages en Settings > Pages
```

## ⚙️ Configuración Rápida

### Variables de Entorno Backend (.env)

```env
PORT=3001
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key-aqui
ALLOWED_ORIGINS=https://tu-usuario.github.io
NODE_ENV=development
```

### Configuración Frontend (config.js)

```javascript
// Cambiar esta línea:
API_BASE_URL: 'http://localhost:3001'

// Por tu URL:
API_BASE_URL: 'https://tu-backend-url.com'
```

## 📋 Checklist de Implementación

### ✅ Supabase
- [ ] Crear proyecto en Supabase
- [ ] Ejecutar script SQL de la tabla
- [ ] Verificar que RLS esté habilitado
- [ ] Obtener URL y Anon Key

### ✅ Backend
- [ ] Instalar dependencias Node.js
- [ ] Configurar variables de entorno
- [ ] Probar servidor con `/health`
- [ ] Verificar conexión a Supabase

### ✅ Frontend
- [ ] Subir a repositorio GitHub
- [ ] Configurar GitHub Pages
- [ ] Actualizar URL del API
- [ ] Probar en navegador

### ✅ Testing
- [ ] Crear primera auditoría
- [ ] Probar filtros
- [ ] Verificar estadísticas
- [ ] Probar edición/eliminación

## 🔧 Solución de Problemas Comunes

### Error: "Failed to fetch"
**Problema**: Frontend no puede conectar al backend
**Solución**:
1. Verificar que el backend esté corriendo
2. Verificar CORS en backend
3. Verificar URL correcta en config.js

### Error: "Invalid API key"
**Problema**: Credenciales de Supabase incorrectas
**Solución**:
1. Verificar SUPABASE_URL en .env
2. Verificar SUPABASE_ANON_KEY en .env
3. Regenerar keys si es necesario

### Error: "Permission denied"
**Problema**: RLS policies en Supabase
**Solución**:
1. Verificar que las políticas estén creadas
2. Habilitar acceso anónimo si es necesario
3. Verificar que la tabla existe

### Error: "Table 'dotaudit' not found"
**Problema**: Tabla no creada en Supabase
**Solución**:
1. Ejecutar el script SQL de nuevo
2. Verificar que el nombre de la tabla sea exacto: `public.dotaudit`
3. Verificar en el dashboard de Supabase

## 📊 Dashboard de Supabase

Verificar en el dashboard:
1. **Table Editor**: Ver datos en la tabla `dotaudit`
2. **SQL Editor**: Ejecutar consultas de prueba
3. **API**: Ver logs de la API
4. **Database**: Verificar conexiones

## 🔐 Configuración de Seguridad (Producción)

### Backend (.env.production)

```env
NODE_ENV=production
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-prod-anon-key
ALLOWED_ORIGINS=https://tu-dominio.com
PORT=3001
```

### Supabase RLS Policies (Recomendado)

```sql
-- Para uso público (desarrollo)
CREATE POLICY "Habilitar todo para anon" ON public.dotaudit
    FOR ALL USING (true);

-- Para uso restringido (producción)
CREATE POLICY "Solo lectura pública" ON public.dotaudit
    FOR SELECT USING (true);

CREATE POLICY "Solo inserción pública" ON public.dotaudit
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Solo actualización propia" ON public.dotaudit
    FOR UPDATE USING (auth.uid()::text = user_id);
```

## 🎯 Scripts Útiles

### Test de Conexión Supabase

```sql
-- Ejecutar en Supabase SQL Editor
SELECT COUNT(*) as total_audits FROM public.dotaudit;
```

### Health Check Backend

```bash
curl http://localhost:3001/health
```

### Test API desde Navegador

```javascript
// Abrir consola del navegador
fetch('http://localhost:3001/health')
  .then(response => response.json())
  .then(data => console.log(data));
```

## 📱 Configuración Móvil

El frontend es completamente responsive. Para optimizar:

1. **GitHub Pages**: Ya funciona en móviles
2. **Backend**: Verificar que accept connections externas
3. **HTTPS**: Para producción, usar HTTPS en el backend

## 🔄 Backup y Mantenimiento

### Backup de Datos

```sql
-- En Supabase SQL Editor
SELECT * FROM public.dotaudit 
ORDER BY created_at DESC 
LIMIT 1000;
```

### Limpieza de Datos (si es necesario)

```sql
-- Eliminar registros anteriores a 2020
DELETE FROM public.dotaudit 
WHERE audit_date < '2020-01-01';
```

## 📞 Soporte Adicional

Si tienes problemas:

1. **Revisar documentación completa** en `docs/README.md`
2. **Verificar logs** en navegador y servidor
3. **Probar API directamente** con Postman o similar
4. **Verificar configuración** paso a paso

¡El sistema está listo para usar! 🏌️‍♂️