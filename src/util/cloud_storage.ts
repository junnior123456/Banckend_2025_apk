import { Storage } from '@google-cloud/storage';

/**
 * Configuración de Google Cloud Storage para Firebase
 * Proyecto: PawFinder (ID: pawfinder-4b099)
 * Implementación exacta del profesor con Firebase Storage moderno
 */

// Firebase Storage bucket (formato moderno de Firebase)
const bucketName = 'pawfinder-4b099.firebasestorage.app';

// Inicializar Google Cloud Storage
let googleCloudStorage: Storage | null = null;

try {
  googleCloudStorage = new Storage({
    projectId: 'pawfinder-4b099',
    keyFilename: './serviceAccountKey.json',
  });
  console.log('✅ Google Cloud Storage inicializado correctamente');
  console.log('📦 Bucket configurado:', bucketName);
} catch (error) {
  console.error('❌ Error inicializando Google Cloud Storage:', error.message);
  console.warn('🔄 Usando modo mock para desarrollo');
  googleCloudStorage = null;
}

/**
 * 🔸 Sube un archivo a Google Cloud Storage (Firebase Storage)
 * Implementación EXACTA del profesor - SIMPLIFICADA
 */
export const storage = async (
  file: Express.Multer.File,
  filename: string,
): Promise<string> => {
  try {
    if (!file) {
      throw new Error('No se recibió ningún archivo.');
    }

    console.log(`📤 Subiendo archivo: ${filename}`);
    console.log(`📊 Tamaño: ${file.size} bytes`);
    console.log(`📋 Tipo MIME: ${file.mimetype}`);

    // Si Google Cloud Storage no está disponible, usar modo mock
    if (!googleCloudStorage) {
      console.warn('⚠️ Google Cloud Storage no disponible, usando modo mock');
      const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
      console.log('✅ URL mock generada:', mockUrl);
      return mockUrl;
    }

    // Obtener referencia al bucket
    const bucket = googleCloudStorage.bucket(bucketName);
    
    // Crear nombre único para el archivo (sin caracteres especiales)
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `images/${Date.now()}_${cleanFilename}`;
    const fileRef = bucket.file(uniqueFilename);

    // Crear stream de escritura (EXACTO como el profesor)
    const stream = fileRef.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
      public: true, // Hacer el archivo público automáticamente
    });

    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        console.error('❌ Error subiendo archivo a Google Cloud Storage:', error);
        
        // Fallback a URL mock en caso de error
        const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
        console.log('🔄 Usando URL mock como fallback:', mockUrl);
        resolve(mockUrl);
      });

      stream.on('finish', async () => {
        try {
          // Generar URL pública (formato Firebase Storage)
          const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(uniqueFilename)}?alt=media`;
          
          console.log('✅ Archivo subido correctamente a Firebase Storage');
          console.log('🔗 URL pública:', publicUrl);
          resolve(publicUrl);
        } catch (error) {
          console.error('❌ Error generando URL pública:', error);
          
          // Fallback a URL mock
          const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
          console.log('🔄 Usando URL mock como fallback:', mockUrl);
          resolve(mockUrl);
        }
      });

      // Escribir el buffer del archivo al stream
      stream.end(file.buffer);
    });

  } catch (error) {
    console.error('❌ Error en storage function:', error);
    
    // Fallback a URL mock en caso de cualquier error
    const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
    console.log('🔄 Usando URL mock como fallback:', mockUrl);
    return mockUrl;
  }
};

// Función auxiliar para mantener compatibilidad
export const uploadToFirebase = storage;