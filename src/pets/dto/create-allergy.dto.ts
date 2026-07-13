import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAllergyDto {
  @IsString()
  @MaxLength(150)
  substance: string;

  @IsOptional()
  @IsIn(['leve', 'moderada', 'grave'])
  severity?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
