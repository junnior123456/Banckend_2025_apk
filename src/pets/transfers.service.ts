import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Pet } from './pet.entity';
import { PetTransfer } from './pet-transfer.entity';
import { User } from '../users/user.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

export interface TransferOptions {
  reason?: 'adoption' | 'manual';
  adoptionRequestId?: number;
  performedBy?: number;
}

/**
 * Módulo 3 — Transferencia del expediente al nuevo dueño.
 *
 * El expediente (vacunas, peso, alergias, medicación, historia clínica y
 * documentos) cuelga de `petId`, así que viaja solo al cambiar `pet.userId`.
 * Lo que NO puede viajar es el consentimiento de IA: es una decisión personal
 * del dueño anterior, y se revoca siempre.
 */
@Injectable()
export class TransfersService {
  private readonly logger = new Logger(TransfersService.name);

  constructor(
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
    @InjectRepository(PetTransfer)
    private readonly transferRepo: Repository<PetTransfer>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly notifications: NotificationsService,
    private readonly dataSource: DataSource,
  ) {}

  async history(petId: number, userId: number, roles: string[]) {
    const pet = await this.petRepo.findOne({ where: { id: petId } });
    if (!pet) throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);
    const privileged = (roles || []).includes('1') || (roles || []).includes('3');
    if (pet.userId !== userId && !privileged) {
      throw new HttpException('No autorizado sobre esta mascota', HttpStatus.FORBIDDEN);
    }
    return this.transferRepo.find({ where: { petId }, order: { createdAt: 'DESC' } });
  }

  /** Traspaso manual pedido desde la app: se identifica al destinatario por email. */
  async transferByEmail(
    petId: number,
    email: string,
    actorUserId: number,
    roles: string[],
  ) {
    const pet = await this.petRepo.findOne({ where: { id: petId } });
    if (!pet) throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);

    const isAdmin = (roles || []).includes('1');
    if (pet.userId !== actorUserId && !isAdmin) {
      throw new HttpException(
        'Solo el dueño puede transferir el expediente',
        HttpStatus.FORBIDDEN,
      );
    }

    const target = await this.userRepo.findOne({
      where: { email: email.trim().toLowerCase() },
    });
    if (!target) {
      throw new HttpException(
        'No hay ningún usuario registrado con ese correo',
        HttpStatus.NOT_FOUND,
      );
    }

    return this.transferOwnership(petId, target.id, {
      reason: 'manual',
      performedBy: actorUserId,
    });
  }

  /**
   * Cambia el dueño y registra el traspaso, en una transacción: si algo falla,
   * la mascota no se queda a medio camino entre dos dueños.
   */
  async transferOwnership(
    petId: number,
    toUserId: number,
    opts: TransferOptions = {},
  ) {
    return this.dataSource.transaction(async (manager) => {
      // Esta transacción usa su PROPIO queryRunner, que no pasa por el
      // interceptor que fija app.user_id. Con RLS activo en `pet_transfer`, el
      // INSERT del traspaso se denegaría (sin contexto = deniega). Se marca como
      // sistema SÓLO dentro de esta transacción (LOCAL): la autorización real ya
      // se comprobó arriba (dueño o admin) antes de llegar aquí.
      await manager.query("SELECT set_config('app.system', 'on', true)");

      const pet = await manager.findOne(Pet, { where: { id: petId } });
      if (!pet) throw new HttpException('Mascota no encontrada', HttpStatus.NOT_FOUND);

      const fromUserId = pet.userId;
      if (fromUserId === toUserId) {
        throw new HttpException(
          'La mascota ya pertenece a ese usuario',
          HttpStatus.BAD_REQUEST,
        );
      }

      const target = await manager.findOne(User, { where: { id: toUserId } });
      if (!target) {
        throw new HttpException('Usuario destino no encontrado', HttpStatus.NOT_FOUND);
      }

      pet.userId = toUserId;
      // El consentimiento de IA lo dio el dueño anterior: no se hereda.
      pet.aiConsent = false;
      pet.aiConsentAt = null;
      pet.aiConsentBy = null;
      await manager.save(pet);

      const transfer = await manager.save(
        manager.create(PetTransfer, {
          petId,
          fromUserId,
          toUserId,
          performedBy: opts.performedBy ?? null,
          reason: opts.reason ?? 'manual',
          adoptionRequestId: opts.adoptionRequestId ?? null,
        }),
      );

      this.logger.log(
        `Expediente de ${pet.name} (pet ${petId}) transferido de ${fromUserId} a ${toUserId} (${transfer.reason})`,
      );

      // Las notificaciones van fuera del camino crítico: si fallan, el traspaso vale igual.
      this.notifyBoth(pet.name, petId, fromUserId, toUserId, transfer.reason).catch((e) =>
        this.logger.error(`Notificando el traspaso de ${petId}: ${e.message}`),
      );

      return {
        transferred: true,
        petId,
        petName: pet.name,
        fromUserId,
        toUserId,
        reason: transfer.reason,
        aiConsentRevoked: true,
      };
    });
  }

  private async notifyBoth(
    petName: string,
    petId: number,
    fromUserId: number,
    toUserId: number,
    reason: string,
  ) {
    const data = { petId, petName, fromUserId, toUserId, reason };
    await this.notifications.createNotification(
      toUserId,
      `📋 Recibiste el expediente de ${petName}`,
      `Ya eres el dueño de ${petName}. Su expediente de salud completo (vacunas, historia clínica y documentos) es ahora tuyo. Revisa que todo esté al día.`,
      NotificationType.PET_TRANSFERRED,
      data,
      petId,
    );
    await this.notifications.createNotification(
      fromUserId,
      `📋 Entregaste el expediente de ${petName}`,
      `El expediente de salud de ${petName} pasó a su nuevo dueño. Ya no tienes acceso a sus documentos médicos.`,
      NotificationType.PET_TRANSFERRED,
      data,
      petId,
    );
  }
}
