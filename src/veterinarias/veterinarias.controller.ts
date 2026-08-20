import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { VeterinariasService } from './veterinarias.service';
import { CreateVeterinariaDto } from './dto/create-veterinaria.dto';
import { UpdateVeterinariaDto } from './dto/update-veterinaria.dto';

/**
 * Directorio de veterinarias.
 * Lecturas públicas del directorio; las de gestión exigen JWT (VET dueño o ADMIN).
 * Siempre `req.user.userId`.
 */
@Controller('veterinarias')
export class VeterinariasController {
  constructor(private readonly service: VeterinariasService) {}

  // ---- Público ----
  @Get()
  listPublic() {
    return this.service.listPublic();
  }

  /**
   * GET /api/veterinarias/nearby?lat=-6.4869&lng=-76.3626&radiusKm=10
   * Veterinarias cerca de donde esta el usuario, de la mas cercana a la mas
   * lejana. Publico, igual que el resto del directorio. Cada ficha llega con
   * un campo extra "distanceKm".
   * Va ANTES de @Get(":id") o Nest interpretaria "nearby" como un id.
   */
  @Get('nearby')
  listNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('limit') limit?: string,
  ) {
    const latitud = Number(lat);
    const longitud = Number(lng);
    if (!Number.isFinite(latitud) || !Number.isFinite(longitud)) {
      throw new BadRequestException(
        'Hacen falta lat y lng, y tienen que ser numeros',
      );
    }
    if (latitud < -90 || latitud > 90 || longitud < -180 || longitud > 180) {
      throw new BadRequestException('lat o lng fuera de rango');
    }
    // Por defecto 10 km, que en Tarapoto cubre la ciudad entera.
    const radio = Number(radiusKm) > 0 ? Number(radiusKm) : 10;
    const tope = Number(limit) > 0 ? Math.min(Number(limit), 50) : 20;
    return this.service.listNearby(latitud, longitud, radio, tope);
  }

  // ---- Gestión (rutas específicas ANTES de :id) ----
  @Get('admin/all')
  @UseGuards(JwtAuthGuard)
  listAll(@Req() req: any) {
    return this.service.listAll(req.user.roles);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  listMine(@Req() req: any) {
    return this.service.listMine(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Body() dto: CreateVeterinariaDto, @Req() req: any) {
    return this.service.create(dto, req.user.userId, req.user.roles);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateVeterinariaDto,
    @Req() req: any,
  ) {
    return this.service.update(id, dto, req.user.userId, req.user.roles);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.service.remove(id, req.user.userId, req.user.roles);
  }

  // Público, al final para no capturar 'mine' ni 'admin'.
  @Get(':id')
  findPublic(@Param('id', ParseIntPipe) id: number) {
    return this.service.findPublic(id);
  }
}
