import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { WeightsService } from './weights.service';
import { CreateWeightDto } from './dto/create-weight.dto';

/**
 * Módulo 3 — Control de peso.
 * Ruta: /api/pets/:petId/weights  (requiere JWT)
 */
@Controller('pets/:petId/weights')
@UseGuards(JwtAuthGuard)
export class WeightsController {
  constructor(private readonly service: WeightsService) {}

  @Get()
  list(@Req() req: any, @Param('petId', ParseIntPipe) petId: number) {
    return this.service.list(petId, req.user.userId, req.user.roles);
  }

  @Post()
  create(
    @Req() req: any,
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: CreateWeightDto,
  ) {
    return this.service.create(petId, dto, req.user.userId, req.user.roles);
  }

  @Delete(':id')
  remove(
    @Req() req: any,
    @Param('petId', ParseIntPipe) petId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.remove(petId, id, req.user.userId, req.user.roles);
  }
}
