/**
 * APPLICATION LAYER - DTO para el match (comparación) de mascotas por foto
 */
import { IsArray, IsString } from 'class-validator';

export class PetMatchDto {
  @IsString()
  lostImageUrl: string; // Foto del perro perdido (URL o data URL)

  @IsArray()
  candidates: { id: number; imageUrl: string }[]; // Perros encontrados a comparar
}
