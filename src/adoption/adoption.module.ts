import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdoptionRequest } from './adoption-request.entity';
import { AdoptionController } from './adoption.controller';
import { AdoptionService } from './adoption.service';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AdoptionRequest, Pet, User])],
  controllers: [AdoptionController],
  providers: [AdoptionService],
  exports: [AdoptionService, TypeOrmModule],
})
export class AdoptionModule {}