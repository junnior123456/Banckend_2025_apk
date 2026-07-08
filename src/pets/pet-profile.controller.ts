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
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { PetProfileService } from './pet-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

/** Módulo 3 — Perfil extendido y QR (requiere JWT + propiedad). */
@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetProfileController {
  constructor(private readonly service: PetProfileService) {}

  // GET /api/pets/:id/qr  -> { publicUid }
  @Get(':id/qr')
  qr(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.service.ensureQr(id, req.user.userId, req.user.roles);
  }

  // PATCH /api/pets/:id/profile  -> actualiza especie/nacimiento/microchip
  @Patch(':id/profile')
  updateProfile(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.service.updateProfile(id, dto, req.user.userId, req.user.roles);
  }
}
