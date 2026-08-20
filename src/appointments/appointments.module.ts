import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Appointment } from './appointment.entity';
import { Veterinaria } from '../veterinarias/veterinaria.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatModule } from '../chat/chat.module';
import { VeterinariasModule } from '../veterinarias/veterinarias.module';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Veterinaria]),
    NotificationsModule,
    ChatModule,
    // Para validar contra la agenda al reservar (huecos libres, horas ocupadas).
    VeterinariasModule,
  ],
  controllers: [AppointmentsController],
  providers: [AppointmentsService],
})
export class AppointmentsModule {}
