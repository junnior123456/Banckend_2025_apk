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
import { VaccinationsService } from './vaccinations.service';
import { CreateVaccinationDto } from './dto/create-vaccination.dto';

/**
 * Módulo 3 — Vacunas del expediente de la mascota.
 * Ruta: /api/pets/:petId/vaccinations  (requiere JWT)
 */
@Controller('pets/:petId/vaccinations')
@UseGuards(JwtAuthGuard)
export class VaccinationsController {
  constructor(private readonly service: VaccinationsService) {}

  @Get()
  list(@Req() req: any, @Param('petId', ParseIntPipe) petId: number) {
    return this.service.list(petId, req.user.userId, req.user.roles);
  }

  @Post()
  create(
    @Req() req: any,
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: CreateVaccinationDto,
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
