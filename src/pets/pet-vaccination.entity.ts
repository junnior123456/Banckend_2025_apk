import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/**
 * Módulo 3 — Expediente Digital de la Mascota
 * Registro de vacunas de una mascota (sub-recurso de pets).
 */
@Entity({ name: 'pet_vaccinations' })
export class PetVaccination {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'varchar', length: 120 })
  type: string; // Antirrábica, Parvovirus, Sextuple, etc.

  @Column({ type: 'date' })
  appliedAt: string; // fecha de aplicación (YYYY-MM-DD)

  @Column({ type: 'date', nullable: true })
  nextDueAt: string; // próxima dosis (opcional)

  @Column({ type: 'varchar', length: 80, nullable: true })
  batch: string; // lote

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: true })
  appliedBy: number; // userId de quien registró

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}
