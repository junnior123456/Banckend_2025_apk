# Configuración de Render para PawFinder Backend

## Problema Resuelto
El error `EADDRINUSE: address already in use 0.0.0.0:3000` ocurría porque múltiples instancias intentaban usar el mismo puerto.

## Soluciones Implementadas

### 1. Script de inicio robusto (`start-prod.js`)
- Mata procesos previos en el puerto antes de iniciar
- Maneja señales de terminación correctamente
- Previene múltiples instancias

### 2. Configuración mejorada en `main.ts`
- Logger configurado para producción
- Manejo de errores en bootstrap
- Variables de entorno correctas

### 3. Archivos de configuración
- `render.yaml`: Configuración declarativa para Render
- `Procfile`: Comando de inicio alternativo
- `.renderignore`: Optimiza el deployment

## Configuración en Render Dashboard

### Paso 1: Build Command
```
npm install && npm run build
```

### Paso 2: Start Command
```
npm run start:prod
```

### Paso 3: Variables de Entorno
Configura estas variables en Render Dashboard:

```
NODE_ENV=production
PORT=3000
DB_HOST=<tu-host-railway>
DB_PORT=3306
DB_USERNAME=<tu-usuario>
DB_PASSWORD=<tu-password>
DB_DATABASE=<tu-database>
JWT_SECRET=<tu-secret>
GOOGLE_APPLICATION_CREDENTIALS=<ruta-o-json>
```

### Paso 4: Health Check
- Path: `/api/health`
- Esto permite a Render verificar que la app está funcionando

### Paso 5: Auto-Deploy
- Desactiva "Auto-Deploy" temporalmente si tienes problemas
- Despliega manualmente hasta que esté estable

## Verificación

Después del deployment, verifica:

1. **Logs limpios**: No debe haber errores EADDRINUSE
2. **Health check**: `https://tu-app.onrender.com/api/health` debe responder
3. **Puerto correcto**: Debe usar el puerto asignado por Render

## Troubleshooting

### Si sigue fallando:

1. **Reinicia el servicio completamente** en Render Dashboard
2. **Verifica las variables de entorno** están correctas
3. **Revisa los logs** para errores de base de datos
4. **Prueba el health check** manualmente

### Comandos útiles para debugging local:

```bash
# Construir
npm run build

# Probar producción localmente
npm run start:prod

# Ver qué está usando el puerto 3000 (Windows)
netstat -ano | findstr :3000

# Ver qué está usando el puerto 3000 (Linux/Mac)
lsof -i :3000
```

## Notas Importantes

- El script `start-prod.js` solo mata procesos en Linux/Mac automáticamente
- En Render (Linux), esto debería funcionar perfectamente
- El health check en `/api/health` es crucial para que Render sepa que la app está lista
- Si cambias el puerto, actualiza también el `render.yaml`
