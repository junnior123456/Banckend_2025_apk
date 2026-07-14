import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { AppointmentStatus } from '../appointment.entity';

export class CreateAppointmentDto {
  @IsInt()
  veterinariaId: number;

  @IsOptional()
  @IsInt()
  petId?: number;

  @IsDateString()
  scheduledAt: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}

export class UpdateAppointmentStatusDto {
  // Estados que puede fijar quien llama; el servicio valida quién puede cada uno.
  @IsEnum(AppointmentStatus)
  status: AppointmentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  vetNote?: string;
}
