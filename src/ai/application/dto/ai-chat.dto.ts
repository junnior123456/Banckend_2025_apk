/**
 * APPLICATION LAYER - DTOs para el chat con la IA
 */
import { IsEnum, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';
import { AiChatType } from '../../domain/entities/ai-chat.entity';

export class AiChatDto {
  @IsString()
  @MaxLength(1000)
  message: string; // Mensaje del usuario

  @IsEnum(AiChatType)
  @IsOptional()
  chatType?: AiChatType; // Tipo de consulta (opcional, default: GENERAL)

  // Contexto opcional del perro para seguimiento de cuidado
  @IsString()
  @IsOptional()
  dogName?: string;

  @IsString()
  @IsOptional()
  dogBreed?: string;

  @IsNumber()
  @IsOptional()
  dogAge?: number; // En meses

  @IsNumber()
  @IsOptional()
  dogWeight?: number; // En kg
}

export class VetReferralDto {
  @IsString()
  @MaxLength(500)
  concern: string; // Preocupación o síntoma del perro
}
