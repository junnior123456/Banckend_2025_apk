/**
 * Módulo de IA para PawFinder
 * Proveedor actual: GitHub Models (endpoint compatible OpenAI) — ver gemini.service.ts
 * Contexto: Tarapoto, San Martín, Perú
 */
import { Module } from '@nestjs/common';
import { AiController } from './presentation/ai.controller';
import { GeminiService } from './infrastructure/gemini.service';
import { PetsModule } from '../pets/pets.module';
import { VeterinariasModule } from '../veterinarias/veterinarias.module';

@Module({
  imports: [PetsModule, VeterinariasModule], // expediente + directorio de veterinarias
  controllers: [AiController],
  providers: [GeminiService],
  exports: [GeminiService], // Exportar para usar en otros módulos si se necesita
})
export class AiModule {}
