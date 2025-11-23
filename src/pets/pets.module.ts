import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PetsService } from './pets.service';
import { PetsController } from './pets.controller';
import { Pet } from './pet.entity';
import { PetImage } from './pet-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Pet, PetImage])],
  controllers: [PetsController],
  providers: [PetsService],
  exports: [PetsService],
})
export class PetsModule {}
