import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/** Módulo 3 — Medicación registrada en el expediente. */
@Entity({ name: 'pet_medications' })
export class PetMedication {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  dose: string; // p.ej. 1 tableta, 5 ml

  @Column({ type: 'varchar', length: 100, nullable: true })
  frequency: string; // p.ej. cada 12h, 1 vez al día

  @Column({ type: 'date' })
  startAt: string;

  @Column({ type: 'date', nullable: true })
  endAt: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: true })
  prescribedBy: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}
