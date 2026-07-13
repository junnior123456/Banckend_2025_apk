import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from 'typeorm';

/** Momentos en los que avisamos de una vacuna. */
export type ReminderKind = 'd7' | 'd1' | 'due';

/**
 * Módulo 3 — Registro de recordatorios de vacunas YA enviados.
 * Existe para que el cron diario sea idempotente: si se ejecuta dos veces
 * el mismo día (reinicio de pm2, doble despliegue), no reenvía el aviso.
 */
@Entity({ name: 'vaccine_reminder_log' })
// `dueAt` entra en la clave: si el dueño corrige la fecha de la próxima dosis,
// los avisos de la nueva fecha vuelven a enviarse.
@Index('uq_vaccine_reminder', ['vaccinationId', 'kind', 'dueAt'], { unique: true })
export class VaccineReminderLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  vaccinationId: number;

  @Column({ type: 'varchar', length: 8 })
  kind: ReminderKind;

  /** Fecha de vencimiento a la que corresponde el aviso (YYYY-MM-DD). */
  @Column({ type: 'date' })
  dueAt: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  sentAt: Date;
}
