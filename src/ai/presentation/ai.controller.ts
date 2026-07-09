/**
 * PRESENTATION LAYER - Controlador de IA
 * Expone los endpoints de la IA para PawFinder
 * Todos los endpoints requieren autenticación JWT
 */
import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { GeminiService } from '../infrastructure/gemini.service';
import { DogRecommendationDto } from '../application/dto/dog-recommendation.dto';
import { AiChatDto, VetReferralDto } from '../application/dto/ai-chat.dto';
import { AnalyzePhotoDto } from '../application/dto/analyze-photo.dto';
import { PetMatchDto } from '../application/dto/pet-match.dto';
import { PetChatDto } from '../application/dto/pet-chat.dto';
import { AiChatType } from '../domain/entities/ai-chat.entity';
import { PetContextService } from '../../pets/pet-context.service';

@Controller('ai')
@UseGuards(JwtAuthGuard) // Todos los endpoints requieren autenticación
export class AiController {
  constructor(
    private readonly geminiService: GeminiService,
    private readonly petContextService: PetContextService,
  ) {}

  /**
   * GET /api/ai/status
   * Verifica si el servicio de IA está disponible
   */
  @Get('status')
  getStatus() {
    return {
      status: 'ok',
      service: 'PawBot - Asistente IA de PawFinder',
      provider: 'GitHub Models (OpenAI-compatible)',
      configured: !!process.env.GITHUB_TOKEN,
      features: [
        'Recomendación de perros para adoptar',
        'Seguimiento del cuidado del perro',
        'Referencia a veterinarias en Tarapoto',
        'Chat general sobre perros',
        'Análisis de foto de perro (visión)',
        'Match de mascotas por foto (visión)',
      ],
      location: 'Tarapoto, San Martín, Perú',
    };
  }

  /**
   * POST /api/ai/recommend-dog
   * Recomienda qué tipo de perro es más apto para el usuario
   * Body: DogRecommendationDto
   */
  @Post('recommend-dog')
  async recommendDog(@Request() req, @Body() dto: DogRecommendationDto) {
    const userId = req.user.userId; // la estrategia JWT expone userId, no id
    const response = await this.geminiService.recommendDog(userId, dto);
    return {
      success: true,
      type: AiChatType.DOG_RECOMMENDATION,
      response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/ai/care-tracking
   * Seguimiento del cuidado del perro adoptado
   * Body: AiChatDto con chatType = CARE_TRACKING
   */
  @Post('care-tracking')
  async trackCare(@Request() req, @Body() dto: AiChatDto) {
    const userId = req.user.userId; // la estrategia JWT expone userId, no id

    // Construir contexto del perro si se proporcionó
    const dogContext = dto.dogName || dto.dogBreed || dto.dogAge || dto.dogWeight
      ? {
          name: dto.dogName,
          breed: dto.dogBreed,
          age: dto.dogAge,
          weight: dto.dogWeight,
        }
      : undefined;

    const response = await this.geminiService.trackDogCare(userId, dto.message, dogContext);
    return {
      success: true,
      type: AiChatType.CARE_TRACKING,
      response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/ai/vet-referral
   * Refiere a veterinarias en Tarapoto según la preocupación del dueño
   * Body: VetReferralDto
   */
  @Post('vet-referral')
  async vetReferral(@Request() req, @Body() dto: VetReferralDto) {
    const userId = req.user.userId; // la estrategia JWT expone userId, no id
    const response = await this.geminiService.referToVet(userId, dto.concern);
    return {
      success: true,
      type: AiChatType.VET_REFERRAL,
      response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/ai/chat
   * Chat general sobre perros
   * Body: AiChatDto
   */
  @Post('chat')
  async chat(@Request() req, @Body() dto: AiChatDto) {
    const userId = req.user.userId; // la estrategia JWT expone userId, no id
    let response: string;

    // Enrutar según el tipo de chat
    switch (dto.chatType) {
      case AiChatType.DOG_RECOMMENDATION:
        response = await this.geminiService.generalChat(userId, dto.message, dto.history);
        break;
      case AiChatType.CARE_TRACKING:
        response = await this.geminiService.trackDogCare(userId, dto.message);
        break;
      case AiChatType.VET_REFERRAL:
        response = await this.geminiService.referToVet(userId, dto.message);
        break;
      default:
        response = await this.geminiService.generalChat(userId, dto.message, dto.history);
    }

    return {
      success: true,
      type: dto.chatType || AiChatType.GENERAL,
      response,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/ai/analyze-photo
   * Clasifica/describe un perro a partir de su foto (visión)
   * Body: AnalyzePhotoDto { imageUrl }
   */
  @Post('analyze-photo')
  async analyzePhoto(@Request() req, @Body() dto: AnalyzePhotoDto) {
    const analysis = await this.geminiService.classifyDogPhoto(dto.imageUrl);
    return {
      success: true,
      type: 'PHOTO_ANALYSIS',
      analysis,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/ai/match-pets
   * Compara la foto de un perro perdido con candidatos encontrados (visión)
   * Body: PetMatchDto { lostImageUrl, candidates[] }
   */
  @Post('match-pets')
  async matchPets(@Request() req, @Body() dto: PetMatchDto) {
    const matches = await this.geminiService.matchPets(dto.lostImageUrl, dto.candidates);
    return {
      success: true,
      type: 'PET_MATCH',
      matches,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /api/ai/pet-chat
   * Chat contextual sobre una mascota. El expediente sólo se pasa al modelo si
   * el dueño activó `aiConsent`; si no, responde genérico y pide activarlo.
   * Body: PetChatDto { petId, message }
   *
   * OJO: la estrategia JWT expone `userId` (no `id`) — ver src/auth/jwt/jwt.strategy.ts
   */
  @Post('pet-chat')
  async petChat(@Request() req, @Body() dto: PetChatDto) {
    const userId = req.user.userId;
    const roles = req.user.roles;

    // Lanza 404 si no existe y 403 si no es dueño ni ADMIN/VET.
    const ctx = await this.petContextService.buildContext(dto.petId, userId, roles);

    const response = await this.geminiService.petChat(
      userId,
      dto.message,
      ctx.petName,
      ctx.contextText,
      dto.history,
    );

    return {
      success: true,
      type: 'PET_CHAT',
      petId: ctx.petId,
      petName: ctx.petName,
      usedRecord: ctx.consent,
      consentRequired: !ctx.consent,
      response,
      timestamp: new Date().toISOString(),
    };
  }
}
