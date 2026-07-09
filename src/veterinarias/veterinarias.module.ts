import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Veterinaria } from './veterinaria.entity';
import { VeterinariasController } from './veterinarias.controller';
import { VeterinariasService } from './veterinarias.service';

@Module({
  imports: [TypeOrmModule.forFeature([Veterinaria])],
  controllers: [VeterinariasController],
  providers: [VeterinariasService],
  exports: [VeterinariasService],
})
export class VeterinariasModule {}
