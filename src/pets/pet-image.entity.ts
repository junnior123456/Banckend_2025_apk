import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Pet } from './pet.entity';

@Entity({ name: 'pet_images' })
export class PetImage {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 500 })
  imageUrl: string;

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