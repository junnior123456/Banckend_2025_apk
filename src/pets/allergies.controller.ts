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
import { AllergiesService } from './allergies.service';
import { CreateAllergyDto } from './dto/create-allergy.dto';

/** Módulo 3 — Alergias. Ruta: /api/pets/:petId/allergies (JWT). */
@Controller('pets/:petId/allergies')
@UseGuards(JwtAuthGuard)
export class AllergiesController {
  constructor(private readonly service: AllergiesService) {}

  @Get()
  list(@Req() req: any, @Param('petId', ParseIntPipe) petId: number) {
    return this.service.list(petId, req.user.userId, req.user.roles);
  }

  @Post()
  create(
    @Req() req: any,
    @Param('petId', ParseIntPipe) petId: number,
    @Body() dto: CreateAllergyDto,
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
