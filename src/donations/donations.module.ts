import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './donation.entity';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { User } from '../users/user.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, User]),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService, TypeOrmModule],
})
export class DonationsModule {}
