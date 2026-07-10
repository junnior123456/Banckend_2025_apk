import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VetRequest } from './vet-request.entity';
import { User } from '../users/user.entity';
import { VetRequestsController } from './vet-requests.controller';
import { VetRequestsService } from './vet-requests.service';

@Module({
  imports: [TypeOrmModule.forFeature([VetRequest, User])],
  controllers: [VetRequestsController],
  providers: [VetRequestsService],
  exports: [VetRequestsService],
})
export class VetRequestsModule {}
