import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * Directorio de veterinarias. Cada ficha la llena su dueño (cuenta con rol VET);
 * el ADMIN puede ver y editar todas. Los usuarios ven las verificadas y activas.
 */
@Entity({ name: 'veterinaria' })
export class Veterinaria {
  @PrimaryGeneratedColumn()
  id: number;

  /** Cuenta VET dueña de la ficha (o el admin que la creó). */
  @Column({ type: 'int' })
  @Index()
  ownerUserId: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  /** RUC de SUNAT, único y validado (dígito verificador). */
  @Column({ type: 'varchar', length: 11, unique: true })
  ruc: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 30, nullable: true })
  whatsapp: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  email: string;

  /** Horario en texto libre, p. ej. "Lun-Sáb 9:00-19:00". */
  @Column({ type: 'varchar', length: 200, nullable: true })
  openingHours: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  /** Duracion de cada turno de cita, en minutos. */
  @Column({ type: 'int', default: 30 })
  slotMinutes: number;

  /** URL del calendario del sistema propio del veterinario (formato iCal/ICS).
   *  De ahi se traen las horas que ya tiene ocupadas fuera de la app. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  externalAgendaUrl: string | null;

  /** Clave para que el sistema del veterinario EMPUJE sus horas ocupadas,
   *  cuando no puede publicar un iCal. Se manda en la cabecera X-Agenda-Key. */
  @Column({ type: 'varchar', length: 80, nullable: true })
  externalAgendaKey: string | null;

  @Column({ type: 'timestamp', nullable: true })
  externalAgendaSyncedAt: Date | null;

  @Column({ type: 'double precision', nullable: true })
  latitude: number;

  @Column({ type: 'double precision', nullable: true })
  longitude: number;

  /** El admin verifica la ficha; solo las verificadas salen al público. */
  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ownerUserId' })
  owner: User;
}
