import { Module } from '@nestjs/common';
import { PawmatchController } from './pawmatch.controller';
import { PawmatchService } from './pawmatch.service';

/**
 * Módulo autónomo (sin dependencias de BD): el modelo es determinista y vive en
 * código, así que sólo expone el controlador y el servicio.
 */
@Module({
  controllers: [PawmatchController],
  providers: [PawmatchService],
})
export class PawmatchModule {}
