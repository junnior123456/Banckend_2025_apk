import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, { message: 'El comentario no puede exceder 1000 caracteres' })
  content: string;
}