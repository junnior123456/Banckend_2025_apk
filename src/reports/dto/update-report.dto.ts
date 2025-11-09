import { IsNotEmpty, IsString, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ReportStatus } from '../report.entity';

export class UpdateReportDto {
  @IsNotEmpty()
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000, { message: 'Las notas no pueden exceder 1000 caracteres' })
  adminNotes?: string;
}