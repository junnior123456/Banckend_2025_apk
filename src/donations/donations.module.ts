import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Donation } from './donation.entity';
import { DonationsController } from './donations.controller';
import { DonationsService } from './donations.service';
import { User } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Donation, User])],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService, TypeOrmModule],
})
export class DonationsModule {}
