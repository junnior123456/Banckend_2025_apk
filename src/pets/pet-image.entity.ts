import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pet } from './pet.entity';

@Entity({ name: 'pet_images' })
export class PetImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string; // URL del archivo: la foto o, si es video, el video

  /** 'image' (por defecto) o 'video'. Un video corto se guarda igual que una
   *  foto: la URL del archivo va tambien en imageUrl. */
  @Column({ type: 'varchar', length: 10, default: 'image' })
  mediaType: string;

  /** Portada del video (primer fotograma). Nulo en las imagenes. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  thumbnailUrl: string;

  /** Duracion del video en segundos. Nulo en las imagenes. */
  @Column({ type: 'int', nullable: true })
  durationSec: number;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean; // Imagen principal de la mascota

  @Column({ type: 'int', nullable: true })
  order: number; // Orden de visualización

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'int' })
  petId: number;

  // Relación con mascota
  @ManyToOne(() => Pet, pet => pet.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;
}