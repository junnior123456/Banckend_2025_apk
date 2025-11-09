import { IsNotEmpty, IsString, IsEnum, IsNumber, IsOptional, MaxLength } from 'class-validator';
import { ReportType, ReportableType } from '../report.entity';

export class CreateReportDto {
  @IsNotEmpty()
  @IsEnum(ReportType)
  type: ReportType;

  @IsNotEmpty()
  @IsEnum(ReportableType)
  reportableType: ReportableType;

  @IsNotEmpty()
  @IsNumber()
  reportableId: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(500, { message: 'La razón no puede exceder 500 caracteres' })
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'La descripción no puede exceder 1000 caracteres' })
  description?: string;
}