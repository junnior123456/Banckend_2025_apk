import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/jwt/jwt.guard';
import { VetRequestsService } from './vet-requests.service';
import { CreateVetRequestDto } from './dto/create-vet-request.dto';

/**
 * Solicitudes de clientes para ser veterinarios.
 * Crear/ver la propia: cualquier usuario logueado. Listar/aprobar/rechazar: solo SUPER ADMIN (rol '1').
 * Siempre `req.user.userId` (el JWT NO trae `id`).
 */
@Controller('vet-requests')
@UseGuards(JwtAuthGuard)
export class VetRequestsController {
  constructor(private readonly service: VetRequestsService) {}

  private assertAdmin(req: any) {
    const roles: string[] = req.user?.roles ?? [];
    if (!roles.includes('1')) {
      throw new HttpException(
        'Solo el administrador puede gestionar solicitudes',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  // ---- Cliente ----
  @Post()
  create(@Req() req: any, @Body() dto: CreateVetRequestDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get('mine')
  mine(@Req() req: any) {
    return this.service.mine(req.user.userId);
  }

  // ---- Admin (rutas específicas antes de :id) ----
  @Get()
  list(@Req() req: any, @Query('status') status?: string) {
    this.assertAdmin(req);
    return this.service.list(status);
  }

  @Patch(':id/approve')
  approve(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    this.assertAdmin(req);
    return this.service.approve(id, req.user.userId);
  }

  @Patch(':id/reject')
  reject(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { note?: string },
  ) {
    this.assertAdmin(req);
    return this.service.reject(id, req.user.userId, body?.note);
  }
}
