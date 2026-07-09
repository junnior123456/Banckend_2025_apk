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
import { MedicalRecordsService } from './medical-records.service';
import { CreateMedicalRecordDto } from './dto/create-medical-record.dto';

/**
 * Módulo 3 — Historia clínica de la mascota.
 * Ruta: /api/pets/:petId/medical-records  (requiere JWT)
 * OJO: la estrategia JWT expone `userId` (no `id`).
 */
@Controller('pets/:petId/medical-records')
@UseGuards(JwtAuthGuard)
export class MedicalRecordsController {
  constructor(private readonly service: MedicalRecordsService) {}

  @Get()
  list(@Req() req: any, @Param('petId', ParseIntPipe) petId: number) {
    return this.service.list(petId, req.user.userId, req.user.roles);
  }

  @Post()
  create(
    @Req() req: any,
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: CreateMedicalRecordDto,
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
