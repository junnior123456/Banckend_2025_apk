import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum AppointmentStatus {
  PENDING = 'pending', // solicitada por el cliente, a la espera del vet
  CONFIRMED = 'confirmed', // el vet la aceptó
  REJECTED = 'rejected', // el vet la rechazó
  CANCELLED = 'cancelled', // el cliente la canceló
  COMPLETED = 'completed', // atendida
}

/**
 * Cita/reserva de un cliente con una veterinaria. El "vet" es el
 * `veterinaria.ownerUserId` (User rol 3). Cada cita puede tener un chat asociado.
 */
@Entity({ name: 'appointments' })
export class Appointment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  clientUserId: number;

  @Column({ type: 'int' })
  veterinariaId: number;

  @Column({ type: 'int', nullable: true })
  petId: number | null;

  @Column({ type: 'timestamp' })
  scheduledAt: Date;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: AppointmentStatus.PENDING })
  status: AppointmentStatus;

  @Column({ type: 'text', nullable: true })
  vetNote: string | null;

  @Column({ type: 'int', nullable: true })
  conversationId: number | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
