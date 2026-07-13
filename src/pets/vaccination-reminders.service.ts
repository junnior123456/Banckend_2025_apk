import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ejecutarComoSistema } from '../common/rls/rls.context';
import { PetVaccination } from './pet-vaccination.entity';
import { Pet } from './pet.entity';
import { ReminderKind, VaccineReminderLog } from './vaccine-reminder.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/notification.entity';

/** Cuántos días antes del vencimiento avisamos. `due` = el mismo día. */
const OFFSETS: { kind: ReminderKind; days: number }[] = [
  { kind: 'd7', days: 7 },
  { kind: 'd1', days: 1 },
  { kind: 'due', days: 0 },
];

export interface ReminderRunResult {
  scanned: number;
  sent: number;
  skipped: number;
  details: string[];
}

/**
 * Módulo 3 — Recordatorios de vacunas.
 *
 * Un cron diario busca vacunas cuya `nextDueAt` cae dentro de 7 días, 1 día,
 * o es hoy, y avisa al dueño. `createNotification` guarda la notificación
 * in-app y, si el usuario tiene `notification_token`, dispara el push por FCM.
 *
 * Es idempotente: cada aviso enviado se registra en `vaccine_reminder_log`,
 * así que reiniciar el proceso o ejecutarlo dos veces no duplica avisos.
 */
@Injectable()
export class VaccinationRemindersService {
  private readonly logger = new Logger(VaccinationRemindersService.name);

  constructor(
    @InjectRepository(PetVaccination)
    private readonly vaccRepo: Repository<PetVaccination>,
    @InjectRepository(Pet)
    private readonly petRepo: Repository<Pet>,
    @InjectRepository(VaccineReminderLog)
    private readonly logRepo: Repository<VaccineReminderLog>,
    private readonly notifications: NotificationsService,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  /** El servidor corre en UTC; sin `timeZone` esto dispararía a las 3 de la mañana. */
  @Cron('0 8 * * *', { name: 'vaccine-reminders', timeZone: 'America/Lima' })
  async dailyRun(): Promise<void> {
    // En cluster, pm2 levanta N procesos y el @Cron dispara en todos: el dueño
    // recibiría el recordatorio N veces. Sólo la instancia 0 lo ejecuta.
    const instance = process.env.NODE_APP_INSTANCE;
    if (instance !== undefined && instance !== '0') {
      this.logger.log(`Recordatorios de vacunas: los envía la instancia 0, no la ${instance}`);
      return;
    }

    // El cron no tiene usuario. Sin contexto de sistema, las políticas de RLS le
    // devolverían cero vacunas y los recordatorios morirían en silencio.
    const result = await ejecutarComoSistema(this.dataSource, () => this.run(false));
    this.logger.log(
      `Recordatorios de vacunas: ${result.sent} enviados, ${result.skipped} ya avisados (${result.scanned} vacunas revisadas)`,
    );
  }

  /** Fecha de hoy + `days`, en formato YYYY-MM-DD y en horario de Lima. */
  private dateIn(days: number): string {
    const lima = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Lima' }),
    );
    lima.setDate(lima.getDate() + days);
    return lima.toISOString().slice(0, 10);
  }

  private message(kind: ReminderKind, petName: string, type: string, dueAt: string) {
    switch (kind) {
      case 'd7':
        return {
          title: `💉 ${petName}: vacuna en 7 días`,
          message: `La vacuna ${type} de ${petName} vence el ${dueAt}. Ve agendando la cita con tu veterinario.`,
        };
      case 'd1':
        return {
          title: `💉 ${petName}: vacuna mañana`,
          message: `Mañana ${dueAt} vence la vacuna ${type} de ${petName}.`,
        };
      case 'due':
        return {
          title: `⚠️ ${petName}: vacuna vencida hoy`,
          message: `Hoy vence la vacuna ${type} de ${petName}. Renuévala para mantener su protección al día.`,
        };
    }
  }

  /**
   * Recorre los tres hitos y avisa. Con `dryRun` no escribe ni envía nada:
   * sirve para probar el cron sin molestar a nadie.
   */
  async run(dryRun = false): Promise<ReminderRunResult> {
    const result: ReminderRunResult = { scanned: 0, sent: 0, skipped: 0, details: [] };

    for (const { kind, days } of OFFSETS) {
      const target = this.dateIn(days);
      const vaccinations = await this.vaccRepo.find({ where: { nextDueAt: target } });
      result.scanned += vaccinations.length;
      if (!vaccinations.length) continue;

      // Una sola consulta para saber cuáles ya se avisaron.
      const already = await this.logRepo.find({
        where: { kind, dueAt: target, vaccinationId: In(vaccinations.map((v) => v.id)) },
      });
      const done = new Set(already.map((l) => l.vaccinationId));

      for (const v of vaccinations) {
        if (done.has(v.id)) {
          result.skipped++;
          continue;
        }
        const pet = await this.petRepo.findOne({ where: { id: v.petId } });
        if (!pet?.userId) {
          result.details.push(`vacuna ${v.id}: mascota ${v.petId} sin dueño, omitida`);
          continue;
        }

        const { title, message } = this.message(kind, pet.name, v.type, target);
        result.details.push(`[${kind}] ${pet.name} · ${v.type} · vence ${target} → user ${pet.userId}`);
        if (dryRun) continue;

        try {
          // Guarda la notificación in-app y dispara el push si hay token FCM.
          await this.notifications.createNotification(
            pet.userId,
            title,
            message,
            NotificationType.VACCINE_REMINDER,
            { kind, petId: pet.id, vaccinationId: v.id, dueAt: target, vaccineType: v.type },
            pet.id,
          );
          await this.logRepo.save(
            this.logRepo.create({ vaccinationId: v.id, kind, dueAt: target }),
          );
          result.sent++;
        } catch (e) {
          // Un fallo con una mascota no debe tumbar el resto del barrido.
          this.logger.error(`Vacuna ${v.id}: ${(e as Error).message}`);
          result.details.push(`vacuna ${v.id}: ERROR ${(e as Error).message}`);
        }
      }
    }

    return result;
  }
}
