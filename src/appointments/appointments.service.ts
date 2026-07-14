import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Appointment, AppointmentStatus } from './appointment.entity';
import { Veterinaria } from '../veterinarias/veterinaria.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';
import { ChatService } from '../chat/chat.service';
import { ConversationType } from '../chat/entities/conversation.entity';
import {
  CreateAppointmentDto,
  UpdateAppointmentStatusDto,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Veterinaria)
    private readonly vetRepo: Repository<Veterinaria>,
    private readonly notifications: NotificationsService,
    private readonly chat: ChatService,
  ) {}

  /** El cliente reserva una cita con una veterinaria. */
  async book(clientId: number, dto: CreateAppointmentDto) {
    const vet = await this.vetRepo.findOne({ where: { id: dto.veterinariaId } });
    if (!vet || vet.isActive === false) {
      throw new NotFoundException('La veterinaria no está disponible');
    }
    if (vet.ownerUserId === clientId) {
      throw new BadRequestException('No puedes reservar en tu propia veterinaria');
    }
    const cuando = new Date(dto.scheduledAt);
    if (isNaN(cuando.getTime()) || cuando.getTime() < Date.now()) {
      throw new BadRequestException('La fecha de la cita debe ser futura');
    }

    // Chat de la cita: cliente ↔ dueño de la veterinaria.
    const conv = await this.chat.openConversation(clientId, {
      withUserId: vet.ownerUserId,
      type: ConversationType.VET,
      veterinariaId: vet.id,
    });

    const cita = await this.appointmentRepo.save(
      this.appointmentRepo.create({
        clientUserId: clientId,
        veterinariaId: vet.id,
        petId: dto.petId ?? null,
        scheduledAt: cuando,
        reason: dto.reason.trim(),
        status: AppointmentStatus.PENDING,
        conversationId: conv.id,
      }),
    );

    await this.avisar(
      vet.ownerUserId,
      '🗓️ Nueva solicitud de cita',
      `Te pidieron una cita en ${vet.name}: ${dto.reason.trim().slice(0, 80)}`,
      NotificationType.APPOINTMENT_REQUEST,
      cita.id,
    );
    return cita;
  }

  /** Citas del cliente. */
  listMine(clientId: number) {
    return this.appointmentRepo.find({
      where: { clientUserId: clientId },
      order: { scheduledAt: 'DESC' },
    });
  }

  /** Citas dirigidas a las veterinarias que posee este vet. */
  async listForVet(vetUserId: number) {
    const vets = await this.vetRepo.find({ where: { ownerUserId: vetUserId } });
    if (vets.length === 0) return [];
    return this.appointmentRepo.find({
      where: { veterinariaId: In(vets.map((v) => v.id)) },
      order: { scheduledAt: 'DESC' },
    });
  }

  /** Cambia el estado. Cliente: solo cancelar. Vet: confirmar/rechazar/atender. */
  async updateStatus(
    userId: number,
    roles: string[],
    id: number,
    dto: UpdateAppointmentStatusDto,
  ) {
    const cita = await this.appointmentRepo.findOne({ where: { id } });
    if (!cita) throw new NotFoundException('Cita no encontrada');
    const vet = await this.vetRepo.findOne({ where: { id: cita.veterinariaId } });

    const esCliente = cita.clientUserId === userId;
    const esVet = vet?.ownerUserId === userId;
    const esAdmin = (roles || []).includes('1');
    if (!esCliente && !esVet && !esAdmin) {
      throw new ForbiddenException('No tienes acceso a esta cita');
    }

    const permitidosCliente = [AppointmentStatus.CANCELLED];
    const permitidosVet = [
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.REJECTED,
      AppointmentStatus.COMPLETED,
    ];
    if (esCliente && !esVet && !esAdmin && !permitidosCliente.includes(dto.status)) {
      throw new ForbiddenException('Como cliente solo puedes cancelar la cita');
    }
    if (esVet && !esAdmin && !permitidosVet.includes(dto.status) && dto.status !== AppointmentStatus.CANCELLED) {
      throw new ForbiddenException('Estado no permitido para la veterinaria');
    }

    cita.status = dto.status;
    if (dto.vetNote !== undefined) cita.vetNote = dto.vetNote;
    const guardada = await this.appointmentRepo.save(cita);

    // Avisar a la otra parte.
    const mapa: Record<string, NotificationType> = {
      confirmed: NotificationType.APPOINTMENT_CONFIRMED,
      rejected: NotificationType.APPOINTMENT_REJECTED,
      cancelled: NotificationType.APPOINTMENT_CANCELLED,
      completed: NotificationType.APPOINTMENT_COMPLETED,
    };
    const tipo = mapa[dto.status];
    if (tipo) {
      const destino = esCliente ? vet?.ownerUserId : cita.clientUserId;
      if (destino) {
        await this.avisar(
          destino,
          '🗓️ Cita actualizada',
          `La cita en ${vet?.name || 'la veterinaria'} cambió a: ${dto.status}`,
          tipo,
          cita.id,
        );
      }
    }
    return guardada;
  }

  private async avisar(
    userId: number,
    title: string,
    message: string,
    type: NotificationType,
    appointmentId: number,
  ) {
    try {
      await this.notifications.createNotification(userId, title, message, type, {
        appointmentId,
      });
    } catch {
      /* la notificación no debe tumbar la operación */
    }
  }
}
