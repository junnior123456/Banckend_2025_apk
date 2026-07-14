import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentsService } from './appointments.service';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';

/**
 * Citas/reservas con veterinarios. El cliente reserva; el vet
 * (veterinaria.ownerUserId) confirma/rechaza/atiende; el cliente puede cancelar.
 */
@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly service: AppointmentsService) {}

  @Post()
  book(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.service.book(req.user.userId, dto);
  }

  @Get('mine')
  mine(@Req() req: any) {
    return this.service.listMine(req.user.userId);
  }

  @Get('vet')
  forVet(@Req() req: any) {
    return this.service.listForVet(req.user.userId);
  }

  @Patch(':id/status')
  updateStatus(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAppointmentStatusDto,
  ) {
    return this.service.updateStatus(
      req.user.userId,
      req.user.roles ?? [],
      id,
      dto,
    );
  }
}
