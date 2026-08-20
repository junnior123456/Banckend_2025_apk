import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsNumber, IsString, MaxLength, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePetDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsInt()
  @Min(1)
  @Max(5)
  categoryId: number;

  @IsOptional()
  @IsBoolean()
  isRisk?: boolean;

  @IsOptional()
  riskTypes?: string[]; // ✅ NUEVO: Array de tipos de riesgo

  @IsOptional()
  @IsString()
  address?: string;

  // Dónde se encuentra el animal, para que la gente sepa dónde buscarlo.
  // Llega del GPS del teléfono al publicar. Las columnas ya existían en la
  // entidad, pero el DTO no las dejaba pasar y siempre quedaban vacías.
  // El @Type es por el multipart: ahí los números llegan como texto.
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  age?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  breed?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  gender?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  size?: string;

  @IsOptional()
  @IsBoolean()
  isVaccinated?: boolean;

  @IsOptional()
  @IsBoolean()
  isSterilized?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  contactPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactEmail?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
