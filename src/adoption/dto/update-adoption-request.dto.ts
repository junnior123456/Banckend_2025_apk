import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { AdoptionStatus } from '../adoption-request.entity';

export class UpdateAdoptionRequestDto {
  @IsNotEmpty()
  @IsEnum(AdoptionStatus)
  status: AdoptionStatus;

  @IsOptional()
  @IsString()
  donorComments?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}