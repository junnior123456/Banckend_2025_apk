import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PawmatchGatoService } from './pawmatch-gato.service';
import { PawmatchGatoDto } from './dto/pawmatch-gato.dto';

/**
 * PawMatch FELINO — compatibilidad adoptante ↔ gato.
 * POST /api/ai/pawmatch/gato  (usuario autenticado)
 *
 * Controlador aparte del canino: el de perros (POST /api/ai/pawmatch) se deja
 * intacto, con su propio DTO y sus propias reglas.
 */
@Controller('ai/pawmatch/gato')
export class PawmatchGatoController {
  constructor(private readonly pawmatchGato: PawmatchGatoService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  predecir(@Body() dto: PawmatchGatoDto) {
    return {
      ok: true,
      data: this.pawmatchGato.predecir(dto),
    };
  }
}
