import {
  IsDateString,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export const MEDICAL_RECORD_TYPES = [
  'consulta',
  'cirugia',
  'examen',
  'desparasitacion',
  'otro',
] as const;

export class CreateMedicalRecordDto {
  @IsIn(MEDICAL_RECORD_TYPES as unknown as string[])
  @IsOptional()
  type?: string;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsDateString()
  occurredAt: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  vetName?: string;

  @IsString()
  @IsOptional()
  diagnosis?: string;

  @IsString()
  @IsOptional()
  treatment?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}
