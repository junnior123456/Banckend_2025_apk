import { IsInt, IsString, MaxLength, MinLength } from 'class-validator';

/** Chat contextual sobre una mascota concreta del usuario. */
export class PetChatDto {
  @IsInt()
  petId: number;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message: string;
}
