import {
  Body,
  Controller,
  Delete,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { User } from '../users/user.entity';

export class PushTokenDto {
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  token: string;
}

/**
 * Registro del token FCM del dispositivo. Sin esto, `notification_token` está
 * vacío para todos los usuarios y ningún push llega nunca.
 * Siempre `req.user.userId`: la estrategia JWT no expone `id`.
 */
@Controller('notifications/push-token')
@UseGuards(JwtAuthGuard)
export class PushTokenController {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  @Post()
  async register(@Body() dto: PushTokenDto, @Req() req: any) {
    await this.userRepo.update(req.user.userId, { notification_token: dto.token });
    return { registered: true };
  }

  /** Al cerrar sesión: deja de recibir push en este dispositivo. */
  @Delete()
  async unregister(@Req() req: any) {
    await this.userRepo.update(req.user.userId, { notification_token: null });
    return { registered: false };
  }
}
