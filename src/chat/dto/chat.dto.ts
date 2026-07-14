import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ConversationType } from '../entities/conversation.entity';

export class OpenConversationDto {
  @IsInt()
  withUserId: number;

  @IsOptional()
  @IsEnum(ConversationType)
  type?: ConversationType;

  @IsOptional()
  @IsInt()
  petId?: number;

  @IsOptional()
  @IsInt()
  veterinariaId?: number;
}

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}
