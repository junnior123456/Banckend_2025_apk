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
} from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { UpdateDonationDto } from './dto/update-donation.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  // 💰 Crear nueva donación (requiere autenticación)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req, @Body() createDonationDto: CreateDonationDto) {
    const userId = req.user.sub; // ID del usuario autenticado
    console.log(`📥 Nueva donación de usuario ${userId}: S/ ${createDonationDto.amount}`);
    return this.donationsService.create(userId, createDonationDto);
  }

  // 📋 Obtener todas las donaciones (admin)
  @UseGuards(JwtAuthGuard)
  @Get()
  async findAll() {
    console.log('📋 Listando todas las donaciones');
    return this.donationsService.findAll();
  }

  // 👤 Obtener mis donaciones
  @UseGuards(JwtAuthGuard)
  @Get('my-donations')
  async getMyDonations(@Request() req) {
    const userId = req.user.sub;
    console.log(`👤 Obteniendo donaciones del usuario ${userId}`);
    return this.donationsService.findByUser(userId);
  }

  // 📊 Obtener estadísticas públicas
  @Get('stats')
  async getStats() {
    console.log('📊 Obteniendo estadísticas de donaciones');
    return this.donationsService.getStats();
  }

  // 🎯 Obtener donaciones recientes
  @Get('recent')
  async getRecent(@Query('limit', ParseIntPipe) limit: number = 10) {
    console.log(`🎯 Obteniendo ${limit} donaciones recientes`);
    return this.donationsService.getRecent(limit);
  }

  // 🏆 Obtener top donadores
  @Get('top-donors')
  async getTopDonors(@Query('limit', ParseIntPipe) limit: number = 5) {
    console.log(`🏆 Obteniendo top ${limit} donadores`);
    return this.donationsService.getTopDonors(limit);
  }

  // 🔍 Obtener una donación específica
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(`🔍 Obteniendo donación ${id}`);
    return this.donationsService.findOne(id);
  }

  // ✅ Confirmar donación
  @UseGuards(JwtAuthGuard)
  @Put(':id/confirm')
  async confirm(
    @Param('id', ParseIntPipe) id: number,
    @Body('transactionId') transactionId: string,
  ) {
    console.log(`✅ Confirmando donación ${id} con transacción ${transactionId}`);
    return this.donationsService.confirm(id, transactionId);
  }

  // 🔄 Actualizar donación
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDonationDto: UpdateDonationDto,
  ) {
    console.log(`🔄 Actualizando donación ${id}`);
    return this.donationsService.update(id, updateDonationDto);
  }
}
