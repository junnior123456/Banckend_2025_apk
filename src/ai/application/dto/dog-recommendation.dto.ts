/**
 * APPLICATION LAYER - DTO para recomendación de perros
 * Valida los datos de entrada del usuario para recomendar un perro
 */
import { IsBoolean, IsEnum, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class DogRecommendationDto {
  @IsEnum(['apartment', 'house_small', 'house_large'])
  livingSpace: 'apartment' | 'house_small' | 'house_large';

  @IsBoolean()
  hasChildren: boolean;

  @IsBoolean()
  hasOtherPets: boolean;

  @IsEnum(['low', 'medium', 'high'])
  activityLevel: 'low' | 'medium' | 'high';

  @IsEnum(['none', 'some', 'experienced'])
  experience: 'none' | 'some' | 'experienced';

  @IsNumber()
  @Min(0)
  @Max(24)
  hoursAlone: number;

  @IsEnum(['low', 'medium', 'high'])
  budget: 'low' | 'medium' | 'high';

  @IsBoolean()
  allergies: boolean;
}
