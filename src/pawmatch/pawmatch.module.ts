import { Module } from '@nestjs/common';
import { PawmatchController } from './pawmatch.controller';
import { PawmatchService } from './pawmatch.service';
import { PawmatchGatoController } from './pawmatch-gato.controller';
import { PawmatchGatoService } from './pawmatch-gato.service';

/**
 * Módulo autónomo (sin dependencias de BD): los modelos son deterministas y
 * viven en código, así que sólo expone controladores y servicios.
 * Perro y gato van por caminos separados (reglas distintas, DTOs distintos).
 */
@Module({
  controllers: [PawmatchController, PawmatchGatoController],
  providers: [PawmatchService, PawmatchGatoService],
})
export class PawmatchModule {}
