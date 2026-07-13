import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PetContextService } from './pet-context.service';
import { AiConsentDto } from './dto/ai-consent.dto';

/**
 * Módulo 3 — Consentimiento de la IA sobre el expediente de una mascota.
 * GET   /api/pets/:id/ai-consent   → estado actual
 * PATCH /api/pets/:id/ai-consent   → { enabled: boolean }
 */
@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetAiConsentController {
  constructor(private readonly contextService: PetContextService) {}

  // OJO: la estrategia JWT expone `userId` (no `id`) — src/auth/jwt/jwt.strategy.ts
  @Get(':id/ai-consent')
  get(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.contextService.getConsent(id, req.user.userId, req.user.roles);
  }

  @Patch(':id/ai-consent')
  set(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AiConsentDto,
  ) {
    return this.contextService.setConsent(
      id,
      dto.enabled,
      req.user.userId,
      req.user.roles,
    );
  }
}
