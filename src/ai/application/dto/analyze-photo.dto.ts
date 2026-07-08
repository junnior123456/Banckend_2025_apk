/**
 * APPLICATION LAYER - DTO para análisis de foto de perro (visión)
 */
import { IsString } from 'class-validator';

export class AnalyzePhotoDto {
  @IsString()
  imageUrl: string; // URL pública o data URL (base64) de la foto del perro
}
