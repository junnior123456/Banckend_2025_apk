import { Injectable, Logger } from '@nestjs/common';
import { storage } from '../util/cloud_storage';

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);

  /**
   * Subir imagen usando Google Cloud Storage
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'images',
  ): Promise<string> {
    try {
      this.logger.log(`📤 Uploading image using Google Cloud Storage`);
      this.logger.debug(`File info: ${file.originalname}, Size: ${file.size} bytes`);

      // Generar nombre único para el archivo
      const fileName = `${folder}/${Date.now()}_${file.originalname}`;
      
      // Usar la función storage del profesor
      const imageUrl = await storage(file, fileName);
      
      this.logger.log(`✅ Image uploaded successfully: ${imageUrl}`);
      return imageUrl;
    } catch (error) {
      this.logger.error(`❌ Error uploading image: ${error.message}`);
      
      // Fallback a URL mock
      const mockUrl = `https://picsum.photos/400/300?random=${Date.now()}`;
      this.logger.log(`🔄 Using mock URL as fallback: ${mockUrl}`);
      return mockUrl;
    }
  }

  /**
   * Eliminar imagen (placeholder - no implementado para URLs mock)
   */
  async deleteImage(imageUrl: string): Promise<boolean> {
    try {
      this.logger.log(`🗑️ Delete image requested: ${imageUrl}`);
      
      // Para URLs mock, simplemente retornar true
      if (imageUrl.includes('picsum.photos')) {
        this.logger.log(`ℹ️ Mock URL detected, skipping deletion`);
        return true;
      }
      
      // Para URLs reales de Google Cloud Storage, implementar eliminación aquí
      this.logger.warn(`⚠️ Real image deletion not implemented yet`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Error deleting image: ${error.message}`);
      return false;
    }
  }
}