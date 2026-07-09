import { IsIn, IsString, MaxLength } from 'class-validator';

/**
 * Un turno previo de la conversación. La app envía los últimos turnos para que
 * el modelo recuerde el hilo y no vuelva a saludar en cada mensaje.
 */
export class ChatTurnDto {
  @IsIn(['user', 'assistant'])
  role: 'user' | 'assistant';

  @IsString()
  @MaxLength(2000)
  content: string;
}

/** Máximo de turnos previos que se reenvían al modelo (control de coste/tokens). */
export const MAX_HISTORY_TURNS = 10;
