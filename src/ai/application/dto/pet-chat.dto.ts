import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ChatTurnDto } from './chat-turn.dto';

/** Chat contextual sobre una mascota concreta del usuario. */
export class PetChatDto {
  @IsInt()
  petId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;

  /** Turnos previos de la conversación (los más recientes al final). */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];
}
