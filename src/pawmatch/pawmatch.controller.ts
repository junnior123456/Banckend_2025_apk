import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PawmatchService } from './pawmatch.service';
import { PawmatchDto } from './dto/pawmatch.dto';

/**
 * PawMatch — compatibilidad adoptante ↔ perro (árbol de decisión).
 * POST /api/ai/pawmatch  (usuario autenticado)
 */
@Controller('ai/pawmatch')
export class PawmatchController {
  constructor(private readonly pawmatch: PawmatchService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  predecir(@Body() dto: PawmatchDto) {
    return {
      ok: true,
      data: this.pawmatch.predecir(dto),
    };
  }
}
