import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/** Módulo 3 — Alergia registrada en el expediente. */
@Entity({ name: 'pet_allergies' })
export class PetAllergy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'varchar', length: 150 })
  substance: string; // p.ej. Pollo, Polen, Penicilina

  @Column({ type: 'varchar', length: 20, default: 'leve' })
  severity: string; // leve | moderada | grave

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
