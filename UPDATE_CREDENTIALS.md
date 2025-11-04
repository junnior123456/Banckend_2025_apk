# 🔑 Actualizar Credenciales de Firebase

## El problema actual:
- ❌ Las credenciales están truncadas: `...(truncated for security)...`
- ❌ Google Cloud Storage no puede inicializarse
- ✅ El sistema funciona con URLs mock como fallback

## Solución:

### Paso 1: Obtener credenciales completas
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto `pawfinder-4b099`
3. Ve a "Configuración del proyecto" (ícono de engranaje)
4. Pestaña "Cuentas de servicio"
5. Haz clic en "Generar nueva clave privada"
6. Descarga el archivo JSON

### Paso 2: Reemplazar archivo completo
1. Abre el archivo descargado (algo como `pawfinder-4b099-firebase-adminsdk-xxxxx.json`)
2. Copia TODO el contenido
3. Reemplaza COMPLETAMENTE el contenido de `eccomerce-bankend/serviceAccountKey.json`
4. Guarda el archivo

### Paso 3: Verificar
Después de guardar, deberías ver en los logs del backend:
- ✅ `Google Cloud Storage inicializado con credenciales reales`
- ✅ `Archivo subido correctamente a Google Cloud Storage`

## Alternativa rápida:
Si tienes las credenciales abiertas en otro editor, simplemente:
1. Selecciona TODO el contenido del archivo de credenciales
2. Copia (Ctrl+C)
3. Abre `serviceAccountKey.json` en Kiro
4. Selecciona todo (Ctrl+A)
5. Pega (Ctrl+V)
6. Guarda (Ctrl+S)

## ¿Cómo saber si funcionó?
Después de actualizar las credenciales:
1. El backend se reiniciará automáticamente
2. Prueba subir una imagen en la app
3. Revisa los logs - deberías ver URLs reales de Google Storage
4. Ve a Firebase Console → Storage → deberías ver las imágenes