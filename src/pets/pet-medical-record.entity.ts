import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/**
 * Módulo 3 — Historia clínica: consultas, cirugías, exámenes, desparasitaciones.
 * Complementa vacunas/peso/alergias/medicación, que tienen su propia tabla.
 */
@Entity({ name: 'pet_medical_records' })
export class PetMedicalRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'varchar', length: 30, default: 'consulta' })
  type: string; // consulta | cirugia | examen | desparasitacion | otro

  @Column({ type: 'varchar', length: 150 })
  title: string; // motivo o nombre del procedimiento

  @Column({ type: 'date' })
  occurredAt: string; // fecha del evento (YYYY-MM-DD)

  @Column({ type: 'varchar', length: 120, nullable: true })
  vetName: string; // veterinario o clínica

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'text', nullable: true })
  treatment: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'int', nullable: true })
  recordedBy: number; // userId de quien lo registró

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}
