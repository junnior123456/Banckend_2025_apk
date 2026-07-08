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
import { MedicationsService } from './medications.service';
import { CreateMedicationDto } from './dto/create-medication.dto';

/** Módulo 3 — Medicación. Ruta: /api/pets/:petId/medications (JWT). */
@Controller('pets/:petId/medications')
@UseGuards(JwtAuthGuard)
export class MedicationsController {
  constructor(private readonly service: MedicationsService) {}

  @Get()
  list(@Req() req: any, @Param('petId', ParseIntPipe) petId: number) {
    return this.service.list(petId, req.user.userId, req.user.roles);
  }

  @Post()
  create(
    @Req() req: any,
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: CreateMedicationDto,
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
