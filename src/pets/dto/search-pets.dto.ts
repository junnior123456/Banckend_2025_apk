import { IsOptional, IsString, IsNumber, IsBoolean, IsArray, IsEnum } from 'class-validator';

export enum PetType {
  DOG = 'dog',
  CAT = 'cat',
  BIRD = 'bird',
  RABBIT = 'rabbit',
  OTHER = 'other'
}

export enum PetSize {
  SMALL = 'Pequeño',
  MEDIUM = 'Mediano',
  LARGE = 'Grande'
}

export enum PetGender {
  MALE = 'Macho',
  FEMALE = 'Hembra'
}

export class SearchPetsDto {
  @IsOptional()
  @IsString()
  query?: string; // Búsqueda por nombre o descripción

  @IsOptional()
  @IsNumber()
  categoryId?: number;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsEnum(PetSize)
  size?: PetSize;

  @IsOptional()
  @IsEnum(PetGender)
  gender?: PetGender;

  @IsOptional()
  @IsString()
  ageRange?: string; // 'puppy', 'young', 'adult', 'senior'

  @IsOptional()
  @IsBoolean()
  isVaccinated?: boolean;

  @IsOptional()
  @IsBoolean()
  isSterilized?: boolean;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsNumber()
  radius?: number; // Radio en kilómetros

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  temperament?: string[];

  @IsOptional()
  @IsString()
  status?: string; // 'available', 'pending', 'adopted'

  @IsOptional()
  @IsBoolean()
  hasSpecialNeeds?: boolean;

  @IsOptional()
  @IsString()
  sortBy?: string; // 'createdAt', 'name', 'age', 'distance'

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC';

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}