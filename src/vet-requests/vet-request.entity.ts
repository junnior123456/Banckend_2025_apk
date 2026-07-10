import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Solicitud de un CLIENTE para convertirse en VETERINARIO.
 * El cliente la envía desde la app; el SUPER ADMIN (rol '1') la aprueba o rechaza.
 * Al aprobar, la cuenta pasa a rol VET ('3').
 */
@Entity({ name: 'vet_request' })
export class VetRequest {
  @PrimaryGeneratedColumn()
  id: number;

  /** Cuenta (cliente) que solicita ser veterinario. */
  @Column({ type: 'int' })
  @Index()
  userId: number;

  @Column({ type: 'varchar', length: 120 })
  fullName: string;

  @Column({ type: 'varchar', length: 30 })
  phone: string;

  /** Nombre de la clínica/veterinaria (opcional). */
  @Column({ type: 'varchar', length: 150, nullable: true })
  clinicName: string;

  /** RUC de SUNAT (opcional en la solicitud; se valida al crear la ficha). */
  @Column({ type: 'varchar', length: 11, nullable: true })
  ruc: string;

  /** Motivo / mensaje del solicitante. */
  @Column({ type: 'text', nullable: true })
  message: string;

  /** pending | approved | rejected */
  @Column({ type: 'varchar', length: 20, default: 'pending' })
  @Index()
  status: string;

  /** Nota del admin al aprobar/rechazar. */
  @Column({ type: 'text', nullable: true })
  reviewNote: string;

  /** userId del admin que revisó. */
  @Column({ type: 'int', nullable: true })
  reviewedBy: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
