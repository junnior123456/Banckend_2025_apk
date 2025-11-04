/**
 * Configuración mock de Firebase para pruebas sin credenciales reales
 * Este archivo simula la conexión a Firebase para desarrollo
 */

export const mockFirebaseConnection = () => {
  console.log('🔹 Firebase conectado correctamente (MODO MOCK).');
  return {
    status: 'connected',
    mode: 'mock',
    projectId: 'pawfinder-4b099',
    storageBucket: 'pawfinder-4b099.appspot.com',
  };
};

export const mockUploadToFirebase = async (
  file: Express.Multer.File,
  pathImage: string,
): Promise<string> => {
  // Simular subida de archivo
  const mockUrl = `https://storage.googleapis.com/pawfinder-4b099.appspot.com/${pathImage}${Date.now()}-${file.originalname}`;
  
  console.log('✅ Archivo subido correctamente (MODO MOCK):', mockUrl);
  return mockUrl;
};