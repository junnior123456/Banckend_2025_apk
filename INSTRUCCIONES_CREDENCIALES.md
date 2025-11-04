# 🔑 Instrucciones para Configurar Credenciales de Firebase

## Pasos para actualizar serviceAccountKey.json:

1. **Copia el contenido completo** del archivo de credenciales que descargaste de Firebase Console
2. **Reemplaza completamente** el contenido de `serviceAccountKey.json` 
3. **Asegúrate** de que el archivo tenga la estructura JSON completa con:
   - `type`: "service_account"
   - `project_id`: "pawfinder-4b099"
   - `private_key_id`: (tu ID real)
   - `private_key`: (tu clave privada completa)
   - `client_email`: (tu email de servicio)
   - `client_id`: (tu ID de cliente)
   - Y todos los demás campos

## ⚠️ IMPORTANTE:
- La `private_key` debe estar completa (no truncada)
- Debe empezar con `-----BEGIN PRIVATE KEY-----`
- Debe terminar con `-----END PRIVATE KEY-----`
- Los saltos de línea deben ser `\n` dentro del JSON

## 🔄 Después de actualizar:
1. Guarda el archivo
2. El backend se reiniciará automáticamente
3. Las imágenes se subirán a Firebase Storage real

## 📝 Ejemplo de estructura:
```json
{
  "type": "service_account",
  "project_id": "pawfinder-4b099",
  "private_key_id": "tu_private_key_id_real",
  "private_key": "-----BEGIN PRIVATE KEY-----\nTU_CLAVE_PRIVADA_COMPLETA_AQUI\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@pawfinder-4b099.iam.gserviceaccount.com",
  "client_id": "tu_client_id_real",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40pawfinder-4b099.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}
```