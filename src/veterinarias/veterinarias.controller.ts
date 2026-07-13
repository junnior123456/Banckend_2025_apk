import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
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
