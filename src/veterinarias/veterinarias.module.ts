import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Veterinaria } from './veterinaria.entity';
import { VetProduct } from './vet-product.entity';
import { VetWorkingHours } from './vet-working-hours.entity';
import { VetBusySlot } from './vet-busy-slot.entity';
import { Appointment } from '../appointments/appointment.entity';
import { VeterinariasController } from './veterinarias.controller';
import { VeterinariasService } from './veterinarias.service';
import { VetStoreController } from './vet-store.controller';
import { VetStoreService } from './vet-store.service';

@Module({
  imports: [
    // Solo el repositorio de Appointment, NO el AppointmentsModule: hace falta
    // para calcular los huecos libres, y traer el modulo entero crearia un
    // ciclo (AppointmentsModule ya depende de este para validar la agenda).
    TypeOrmModule.forFeature([
      Veterinaria,
      VetProduct,
      VetWorkingHours,
      VetBusySlot,
      Appointment,
    ]),
  ],
  controllers: [VeterinariasController, VetStoreController],
  providers: [VeterinariasService, VetStoreService],
  exports: [VeterinariasService, VetStoreService],
})
export class VeterinariasModule {}
