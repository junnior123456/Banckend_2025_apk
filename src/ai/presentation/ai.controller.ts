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
import { AiChatType } from '../domain/entities/ai-chat.entity';

@Controller('ai')
@UseGuards(JwtAuthGuard) // Todos los endpoints requieren autenticación
export class AiController {
  constructor(private readonly geminiService: GeminiService) {}

  /**
   * GET /api/ai/status
   * Verifica si el servicio de IA está disponible
   */
  @Get('status')
  getStatus() {
    return {
      status: 'ok',
      service: 'PawBot - Asistente IA de PawFinder',
      features: [
        'Recomendación de perros para adoptar',
        'Seguimiento del cuidado del perro',
        'Referencia a veterinarias en Tarapoto',
        'Chat general sobre perros',
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
    const userId = req.user.id;
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
    const userId = req.user.id;

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
    const userId = req.user.id;
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
    const userId = req.user.id;
    let response: string;

    // Enrutar según el tipo de chat
    switch (dto.chatType) {
      case AiChatType.DOG_RECOMMENDATION:
        response = await this.geminiService.generalChat(userId, dto.message);
        break;
      case AiChatType.CARE_TRACKING:
        response = await this.geminiService.trackDogCare(userId, dto.message);
        break;
      case AiChatType.VET_REFERRAL:
        response = await this.geminiService.referToVet(userId, dto.message);
        break;
      default:
        response = await this.geminiService.generalChat(userId, dto.message);
    }

    return {
      success: true,
      type: dto.chatType || AiChatType.GENERAL,
      response,
      timestamp: new Date().toISOString(),
    };
  }
}
