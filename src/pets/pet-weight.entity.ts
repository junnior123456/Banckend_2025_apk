import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/**
 * Módulo 3 — Expediente Digital.
 * Serie temporal de peso de una mascota (para gráfico y detección de anomalías).
 */
@Entity({ name: 'pet_weights' })
export class PetWeight {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'float' })
  weightKg: number;

  @Column({ type: 'date' })
  measuredAt: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: true })
  recordedBy: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}
