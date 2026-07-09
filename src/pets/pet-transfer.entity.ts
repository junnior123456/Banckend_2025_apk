import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * Módulo 3 — Traspaso del expediente de una mascota a un nuevo dueño.
 * Deja rastro de quién entregó, quién recibió y por qué (adopción o traspaso manual).
 */
@Entity({ name: 'pet_transfer' })
@Index(['petId'])
export class PetTransfer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'int' })
  fromUserId: number;

  @Column({ type: 'int' })
  toUserId: number;

  /** Quién ejecutó el traspaso (dueño, admin, o el sistema al completar una adopción). */
  @Column({ type: 'int', nullable: true })
  performedBy: number;

  /** adoption | manual */
  @Column({ type: 'varchar', length: 20, default: 'manual' })
  reason: string;

  @Column({ type: 'int', nullable: true })
  adoptionRequestId: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
