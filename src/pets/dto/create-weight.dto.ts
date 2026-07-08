import { IsDateString, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateWeightDto {
  @IsNumber()
  @Min(0.1)
  @Max(200)
  weightKg: number;

  @IsDateString()
  measuredAt: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
