import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from './report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { Comment } from '../comments/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, User, Pet, Comment])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService, TypeOrmModule],
})
export class ReportsModule {}