import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateVeterinariaDto } from './create-veterinaria.dto';

export class UpdateVeterinariaDto extends PartialType(CreateVeterinariaDto) {
  // Solo el admin puede tocar estos; el servicio lo comprueba.
  @IsBoolean()
  @IsOptional()
  isVerified?: boolean;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
