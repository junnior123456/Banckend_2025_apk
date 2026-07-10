import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateVetRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  fullName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  clinicName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(11)
  ruc?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
