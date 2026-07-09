import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Pet } from './pet.entity';

/**
 * Módulo 3 — Documentos y galería del expediente.
 * El archivo NO se guarda en /uploads (público): vive en un directorio privado
 * y sólo se sirve por `GET /api/pets/:petId/documents/:id/file`, con JWT.
 * `storedName` es un UUID generado por el servidor; nunca el nombre del cliente.
 */
@Entity({ name: 'pet_document' })
export class PetDocument {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'varchar', length: 150 })
  title: string;

  // radiografia | analisis | receta | foto | otro
  @Column({ type: 'varchar', length: 30, default: 'otro' })
  category: string;

  /** Nombre físico en disco (UUID + extensión). No expuesto al cliente. */
  @Column({ type: 'varchar', length: 100 })
  storedName: string;

  /** Nombre original, sólo para mostrar y para la descarga. */
  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'int' })
  sizeBytes: number;

  @Column({ type: 'int' })
  uploadedBy: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => Pet, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}
