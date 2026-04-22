/**
 * Módulo de IA para PawFinder
 * Integra Google Gemini para asistencia inteligente sobre perros
 * Contexto: Tarapoto, San Martín, Perú
 */
import { Module } from '@nestjs/common';
import { AiController } from './presentation/ai.controller';
import { GeminiService } from './infrastructure/gemini.service';

@Module({
  controllers: [AiController],
  providers: [GeminiService],
  exports: [GeminiService], // Exportar para usar en otros módulos si se necesita
})
export class AiModule {}
