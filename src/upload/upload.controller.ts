import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Logger,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { UploadService } from './upload.service';

/**
 * Subida de ficheros al servidor.
 *
 * 🔒 TODO el controlador exige sesión. Sin esto, cualquiera en internet podía
 * subir ficheros anónimamente y llenar el disco del servidor: comprobado en la
 * auditoría del 20-ago-2026, devolvía 201 y dejaba el fichero servido por nginx.
 */
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  constructor(private readonly uploadService: UploadService) {}

  @Post('image')
  @UseInterceptors(
    FileInterceptor('image', {
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB máximo
      },
      fileFilter: (req, file, callback) => {
        // Log para debug
        console.log('📋 File info:', {
          originalname: file.originalname,
          mimetype: file.mimetype,
          fieldname: file.fieldname,
        });
        
        // Validar que sea una imagen (más permisivo)
        const isImage = file.mimetype.startsWith('image/') || 
                       file.mimetype.match(/\/(jpg|jpeg|png|gif|webp|bmp|tiff)$/i) ||
                       file.originalname.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)$/i);
        
        if (!isImage) {
          console.log('❌ File rejected:', file.mimetype);
          return callback(
            new BadRequestException(`Only image files are allowed! Received: ${file.mimetype}`),
            false,
          );
        }
        
        console.log('✅ File accepted:', file.mimetype);
        callback(null, true);
      },
    }),
  )
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    this.logger.log(`📤 [UPLOAD] Received image upload request`);
    this.logger.debug(`[UPLOAD] File: ${file?.originalname}, Folder: ${folder || 'images'}`);

    if (!file) {
      this.logger.error(`❌ [UPLOAD] No file provided`);
      throw new BadRequestException('No file provided');
    }

    try {
      const imageUrl = await this.uploadService.uploadImage(
        file,
        folder || 'images',
      );

      this.logger.log(`✅ [UPLOAD] Image uploaded successfully`);
      this.logger.debug(`[UPLOAD] URL: ${imageUrl}`);

      return {
        success: true,
        message: 'Image uploaded successfully',
        imageUrl,
        originalName: file.originalname,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`❌ [UPLOAD] Upload failed: ${error.message}`);
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  /**
   * POST /api/upload/video
   * Sube un video corto para las publicaciones (estilo TikTok).
   * El archivo se guarda TAL CUAL, sin recomprimir: el servidor tiene 2 CPU y
   * transcodificar lo tumbaria. El limite de 50 MB tiene que ir acompasado con
   * el client_max_body_size de nginx (hoy 60M), o nginx corta antes que Nest.
   */
  @Post('video')
  @UseInterceptors(
    FileInterceptor('video', {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50 MB (~30 s grabados con el movil)
      },
      fileFilter: (req, file, callback) => {
        const esVideo =
          file.mimetype.startsWith('video/') ||
          /\.(mp4|mov|webm|3gp|m4v)$/i.test(file.originalname);

        if (!esVideo) {
          return callback(
            new BadRequestException(
              `Solo se permiten videos. Recibido: ${file.mimetype}`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const mb = (file.size / 1024 / 1024).toFixed(1);
    this.logger.log(`📹 [UPLOAD] Video ${file.originalname} (${mb} MB)`);

    const videoUrl = await this.uploadService.uploadVideo(file);

    return {
      success: true,
      message: 'Video uploaded successfully',
      videoUrl,
      originalName: file.originalname,
      size: file.size,
    };
  }
}
