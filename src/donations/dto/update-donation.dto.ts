import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DonationStatus } from '../donation.entity';

export class UpdateDonationDto {
  @IsEnum(DonationStatus, { message: 'Estado inválido' })
  @IsOptional()
  status?: DonationStatus;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsOptional()
  metadata?: any;
}
