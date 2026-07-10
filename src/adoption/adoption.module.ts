import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdoptionRequest } from './adoption-request.entity';
import { AdoptionController } from './adoption.controller';
import { AdoptionService } from './adoption.service';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { PetsModule } from '../pets/pets.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AdoptionRequest, Pet, User]),
    forwardRef(() => NotificationsModule),
    forwardRef(() => PetsModule), // TransfersService: el expediente viaja con la mascota
  ],
  controllers: [AdoptionController],
  providers: [AdoptionService],
  exports: [AdoptionService, TypeOrmModule],
})
export class AdoptionModule {}