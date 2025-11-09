import { IsNotEmpty, IsString, IsNumber, IsOptional, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsNumber()
  petId: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(1000, { message: 'El comentario no puede exceder 1000 caracteres' })
  content: string;

  @IsOptional()
  @IsNumber()
  parentCommentId?: number;
}