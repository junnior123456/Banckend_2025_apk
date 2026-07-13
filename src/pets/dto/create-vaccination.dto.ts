import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateVaccinationDto {
  @IsString()
  @MaxLength(120)
  type: string;

  @IsDateString()
  appliedAt: string;

  @IsOptional()
  @IsDateString()
  nextDueAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  batch?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
