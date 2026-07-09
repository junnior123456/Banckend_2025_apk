import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { IsEmail } from 'class-validator';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { TransfersService } from './transfers.service';

export class TransferPetDto {
  @IsEmail({}, { message: 'Escribe un correo válido' })
  email: string;
}

/**
 * Módulo 3 — Traspaso del expediente. Siempre `req.user.userId`.
 */
@Controller('pets/:petId/transfers')
@UseGuards(JwtAuthGuard)
export class TransfersController {
  constructor(private readonly service: TransfersService) {}

  @Get()
  history(@Param('petId', ParseIntPipe) petId: number, @Req() req: any) {
    return this.service.history(petId, req.user.userId, req.user.roles);
  }

  @Post()
  transfer(
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: TransferPetDto,
    @Req() req: any,
  ) {
    return this.service.transferByEmail(petId, dto.email, req.user.userId, req.user.roles);
  }
}
