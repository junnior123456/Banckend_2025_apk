import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * Donaciones.
 *
 * El JWT expone `{ userId, username, roles }` (ver auth/jwt/jwt.strategy.ts).
 * NO existe `req.user.sub`: usarlo dejaba el userId en `undefined`, así que las
 * donaciones se guardaban sin dueño y "mis donaciones" no encontraba ninguna.
 *
 * El pago es por Yape y lo confirma el propio donante con su código de
 * operación, así que `confirm` sigue siendo suyo — pero sólo sobre SU donación.
 */
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  private esAdmin(req: any): boolean {
    return (req.user?.roles ?? []).includes('1');
  }

  private exigirAdmin(req: any) {
    if (!this.esAdmin(req)) {
      throw new ForbiddenException('Solo el administrador puede hacer esto');
    }
  }

  /** El dueño de la donación, o el admin. Nadie más. */
  private async exigirDuenoOAdmin(req: any, id: number) {
    const donacion = await this.donationsService.findOne(id);
    if (donacion.userId !== req.user.userId && !this.esAdmin(req)) {
      throw new ForbiddenException('Esta donación no es tuya');
    }
    return donacion;
  }

  // 💰 Crear nueva donación (requiere autenticación)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createDonationDto: CreateDonationDto) {
    return this.donationsService.create(req.user.userId, createDonationDto);
  }

  // 📋 Todas las donaciones — SOLO ADMIN (rol '1')
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll(@Request() req) {
    this.exigirAdmin(req);
    return this.donationsService.findAll();
  }

  // 👤 Mis donaciones
  @UseGuards(JwtAuthGuard)
  @Get('my-donations')
  async getMyDonations(@Request() req) {
    return this.donationsService.findByUser(req.user.userId);
  }

  // 📊 Estadísticas públicas (agregados, sin datos personales)
  @Get('stats')
  async getStats() {
    return this.donationsService.getStats();
  }

  // 🎯 Donaciones recientes (públicas)
  @Get('recent')
  async getRecent(@Query('limit', ParseIntPipe) limit: number = 10) {
    return this.donationsService.getRecent(limit);
  }

  // 🏆 Top donadores (público: nombre e importe, nunca el correo)
  @Get('top-donors')
  async getTopDonors(@Query('limit', ParseIntPipe) limit: number = 5) {
    return this.donationsService.getTopDonors(limit);
  }

  // 🔍 Una donación concreta — sólo la tuya (o admin)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.exigirDuenoOAdmin(req, id);
  }

  // ✅ Confirmar el pago (Yape) — sólo tu propia donación
  @UseGuards(JwtAuthGuard)
  @Put(':id/confirm')
  async confirm(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body('transactionId') transactionId: string,
  ) {
    await this.exigirDuenoOAdmin(req, id);
    return this.donationsService.confirm(id, transactionId);
  }

  // 🔄 Editar una donación (importe, estado…) — SOLO ADMIN
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDonationDto: UpdateDonationDto,
  ) {
    this.exigirAdmin(req);
    return this.donationsService.update(id, updateDonationDto);
  }
}
