import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from './push-notification.service';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { AdoptionRequest } from '../adoption/adoption-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Notification, User, Pet, AdoptionRequest])],
  controllers: [NotificationsController],
  providers: [NotificationsService, PushNotificationService],
  exports: [NotificationsService, PushNotificationService, TypeOrmModule],
})
export class NotificationsModule {}