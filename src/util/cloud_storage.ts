import * as fs from 'fs';
import * as path from 'path';

/**
 * Almacenamiento de imágenes en el propio servidor (disco local),
 * servidas por nginx en /uploads/. Reemplaza a Firebase Storage
 * (el proyecto no tiene billing/Blaze activo). Misma firma pública
 * `storage(file, filename)` para no tocar el resto del código.
 */

// Carpeta física donde se guardan las imágenes (persistente, fuera del build)
const UPLOAD_DIR = process.env.UPLOADS_DIR || '/var/pawfinder/uploads';

// Base pública de las URLs (nginx: location /uploads/ -> UPLOAD_DIR)
const PUBLIC_BASE = (
  process.env.PUBLIC_UPLOADS_URL || 'http://167.99.4.161/uploads'
).replace(/\/+$/, '');

// Asegurar la carpeta base al arrancar
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  console.log('✅ Almacenamiento local de imágenes listo en:', UPLOAD_DIR);
  console.log('🔗 URL pública base:', PUBLIC_BASE);
} catch (error) {
  console.error('❌ No se pudo preparar UPLOAD_DIR:', (error as Error).message);
}

function extFromMime(mime?: string): string {
  switch (mime) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    // Video corto (se guarda tal cual, sin recomprimir)
    case 'video/mp4':
      return '.mp4';
    case 'video/quicktime':
      return '.mov';
    case 'video/webm':
      return '.webm';
    case 'video/3gpp':
      return '.3gp';
    default:
      return '';
  }
}

/**
 * 🔸 Guarda un archivo en el disco del servidor y devuelve su URL pública.
 * @param file  archivo de multer (buffer, mimetype, originalname, size)
 * @param filename  nombre sugerido (puede incluir carpeta, p.ej. "pets/123_foto.jpg")
 */
export const storage = async (
  file: Express.Multer.File,
  filename: string,
): Promise<string> => {
  if (!file || !file.buffer) {
    throw new Error('No se recibió ningún archivo.');
  }

  console.log(`📤 Guardando archivo: ${filename}`);
  console.log(`📊 Tamaño: ${file.size} bytes · 📋 MIME: ${file.mimetype}`);

  // Limpiar el nombre (colapsa carpetas/caracteres raros a "_")
  const clean = String(filename).replace(/[^a-zA-Z0-9._-]/g, '_');
  let finalName = `${Date.now()}_${clean}`;
  if (!path.extname(finalName)) {
    finalName += extFromMime(file.mimetype);
  }

  // Los videos van a su propia carpeta: pesan mucho mas que las fotos, y asi
  // se pueden purgar o mover sin tocar las imagenes.
  const subCarpeta = file.mimetype && file.mimetype.startsWith('video/')
    ? 'videos'
    : 'images';
  const relPath = `${subCarpeta}/${finalName}`;
  const absPath = path.join(UPLOAD_DIR, relPath);

  await fs.promises.mkdir(path.dirname(absPath), { recursive: true });
  await fs.promises.writeFile(absPath, file.buffer);

  const publicUrl = `${PUBLIC_BASE}/${relPath}`;
  console.log('✅ Archivo guardado en el servidor:', publicUrl);
  return publicUrl;
};

// Compatibilidad con nombres antiguos
export const uploadToFirebase = storage;

// Compatibilidad: subir desde un objeto { buffer, mimetype, originalname }
export const uploadBufferToFirebase = async (
  fileObj: { buffer: Buffer; mimetype: string; originalname: string },
  prefix: string,
) => {
  const fileLike: any = {
    buffer: fileObj.buffer,
    mimetype: fileObj.mimetype,
    originalname: fileObj.originalname,
    size: fileObj.buffer ? fileObj.buffer.length : 0,
  };
  return storage(fileLike, `${prefix}${fileObj.originalname}`);
};

/**
 * Elimina una imagen guardada localmente (best-effort).
 */
export const deleteFromStorage = async (imageUrl: string): Promise<boolean> => {
  try {
    if (!imageUrl || !imageUrl.startsWith(PUBLIC_BASE)) return true;
    const rel = imageUrl.slice(PUBLIC_BASE.length).replace(/^\/+/, '');
    const abs = path.join(UPLOAD_DIR, rel);
    await fs.promises.unlink(abs).catch(() => undefined);
    return true;
  } catch {
    return false;
  }
};
