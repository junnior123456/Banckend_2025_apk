import { IsNumber, IsString, IsOptional, IsEnum, Min } from 'class-validator';
import { PaymentMethod } from '../donation.entity';

export class CreateDonationDto {
  @IsNumber()
  @Min(1, { message: 'El monto debe ser mayor a 0' })
  amount: number;

  @IsString()
  @IsOptional()
  currency?: string = 'PEN';

  @IsEnum(PaymentMethod, { message: 'Método de pago inválido' })
  paymentMethod: PaymentMethod;

  @IsString()
  @IsOptional()
  transactionId?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsOptional()
  metadata?: any;
}
