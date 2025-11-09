import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsNumber } from 'class-validator';

export class CreateAdoptionRequestDto {
  @IsNotEmpty()
  @IsNumber()
  petId: number;

  @IsNotEmpty()
  @IsString()
  personalInfo: string;

  @IsNotEmpty()
  @IsString()
  livingSituation: string;

  @IsNotEmpty()
  @IsString()
  adoptionReason: string;

  @IsOptional()
  @IsString()
  previousExperience?: string;

  @IsOptional()
  @IsString()
  familyComposition?: string;

  @IsOptional()
  @IsString()
  workSchedule?: string;

  @IsOptional()
  @IsBoolean()
  hasYard?: boolean;

  @IsOptional()
  @IsBoolean()
  hasOtherPets?: boolean;
}