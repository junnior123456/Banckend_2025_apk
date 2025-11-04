# 🔥 Configuración de Firebase para PawFinder Backend

## Pasos para obtener las credenciales correctas:

### 1. Ir a Firebase Console
- Visita: https://console.firebase.google.com/
- Selecciona el proyecto: **PawFinder** (pawfinder-4b099)

### 2. Generar Service Account Key
1. Ve a **Configuración del proyecto** (ícono de engranaje)
2. Pestaña **Cuentas de servicio**
3. Haz clic en **Generar nueva clave privada**
4. Descarga el archivo JSON
5. Renómbralo a `serviceAccountKey.json`
6. Colócalo en la raíz del proyecto backend: `eccomerce-bankend/serviceAccountKey.json`

### 3. Verificar Storage Bucket
- En Firebase Console, ve a **Storage**
- Verifica que el bucket sea: `pawfinder-4b099.appspot.com`
- Si no existe, créalo desde la consola

### 4. Configurar reglas de Storage (opcional)
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // Para desarrollo
    }
  }
}
```

## ✅ Estado actual del proyecto:
- ✅ Firebase Admin SDK instalado
- ✅ Configuración de Firebase creada
- ✅ Función uploadToFirebase() implementada
- ✅ Backend compilando sin errores
- ✅ Rutas /api/users y /api/roles funcionando
- ✅ Servidor corriendo en puerto 3000
- ⚠️ **PENDIENTE**: Reemplazar serviceAccountKey.json con credenciales reales

## 🚀 Para probar la subida de imágenes:
```bash
# Ejemplo con curl (Windows PowerShell):
$form = @{
    image = Get-Item -Path "ruta/a/tu/imagen.jpg"
    name = "Usuario Test"
    email = "test@example.com"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/users/upload/1" -Method PUT -Form $form
```