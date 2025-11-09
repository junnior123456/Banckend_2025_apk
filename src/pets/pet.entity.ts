import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';
import { PetImage } from './pet-image.entity';
import { AdoptionRequest } from '../adoption/adoption-request.entity';
import { Comment } from '../comments/comment.entity';
import { Notification } from '../notifications/notification.entity';

@Entity({ name: 'pets' })
export class Pet {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string;

  @Column({ type: 'boolean', default: false })
  isRisk: boolean; // false = adopción, true = en riesgo

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  age: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  breed: string;

  @Column({ type: 'varchar', length: 10, default: 'Macho' })
  gender: string; // Macho, Hembra

  @Column({ type: 'varchar', length: 20, default: 'Mediano' })
  size: string; // Pequeño, Mediano, Grande

  @Column({ type: 'boolean', default: false })
  isVaccinated: boolean;

  @Column({ type: 'boolean', default: false })
  isSterilized: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactName: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  contactPhone: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  contactEmail: string;

  @Column({ type: 'int', default: 1 }) // Default: Perros
  categoryId: number;

  // Nuevos campos para el sistema completo
  @Column({ type: 'varchar', length: 20, default: 'available' })
  status: string; // available, pending, adopted, removed

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: number; // Para geolocalización

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: number; // Para geolocalización

  @Column({ type: 'text', nullable: true })
  medicalHistory: string; // Historial médico

  @Column({ type: 'text', nullable: true })
  specialNeeds: string; // Necesidades especiales

  @Column({ type: 'varchar', length: 50, nullable: true })
  temperament: string; // Temperamento de la mascota

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Si la publicación está activa

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  // Relación con usuario
  @ManyToOne(() => User, user => user.pets)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Relación con categoría
  @ManyToOne(() => Category, category => category.pets)
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  // Nuevas relaciones
  @OneToMany(() => PetImage, image => image.pet)
  images: PetImage[];

  @OneToMany(() => AdoptionRequest, request => request.pet)
  adoptionRequests: AdoptionRequest[];

  @OneToMany(() => Comment, comment => comment.pet)
  comments: Comment[];

  @OneToMany(() => Notification, notification => notification.pet)
  notifications: Notification[];
}
