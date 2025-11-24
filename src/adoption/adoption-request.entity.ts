import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';

export enum AdoptionStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  AWAITING_ADOPTER_CONFIRMATION = 'awaiting_adopter_confirmation',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

@Entity({ name: 'adoption_requests' })
export class AdoptionRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  personalInfo: string; // Información personal del adoptante

  @Column({ type: 'text' })
  livingSituation: string; // Situación de vivienda

  @Column({ type: 'text' })
  adoptionReason: string; // Motivo de adopción

  @Column({ type: 'text', nullable: true })
  previousExperience: string; // Experiencia previa con mascotas

  @Column({ type: 'text', nullable: true })
  familyComposition: string; // Composición familiar

  @Column({ type: 'varchar', length: 100, nullable: true })
  workSchedule: string; // Horario de trabajo

  @Column({ type: 'boolean', default: false })
  hasYard: boolean; // Tiene patio

  @Column({ type: 'boolean', default: false })
  hasOtherPets: boolean; // Tiene otras mascotas

  // ✅ Campos adicionales para animales en riesgo
  @Column({ type: 'text', nullable: true })
  rescuePlan: string; // Plan de rescate y cuidado

  @Column({ type: 'text', nullable: true })
  medicalCare: string; // Plan de atención médica

  @Column({ type: 'boolean', default: false })
  canProvideMedicalCare: boolean; // Puede costear atención veterinaria

  @Column({ type: 'boolean', default: false })
  hasTransportation: boolean; // Tiene transporte disponible

  @Column({ 
    type: 'enum', 
    enum: AdoptionStatus, 
    default: AdoptionStatus.PENDING 
  })
  status: AdoptionStatus;

  @Column({ type: 'text', nullable: true })
  donorComments: string; // Comentarios del donante

  @Column({ type: 'text', nullable: true })
  rejectionReason: string; // Razón de rechazo si aplica

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  approvedAt: Date; // Fecha de aprobación

  @Column({ type: 'timestamp', nullable: true })
  donorConfirmedAt: Date; // Fecha cuando el donante confirmó la entrega

  @Column({ type: 'timestamp', nullable: true })
  adopterConfirmedAt: Date; // Fecha cuando el adoptante confirmó la recepción

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date; // Fecha de finalización (cuando ambos confirmaron)

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'int' })
  adopterId: number;

  // Relaciones
  @ManyToOne(() => Pet, pet => pet.adoptionRequests, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;

  @ManyToOne(() => User, user => user.adoptionRequests)
  @JoinColumn({ name: 'adopterId' })
  adopter: User;

  // Relación con notificaciones (se definirá en el módulo de notificaciones)
  notifications?: any[];
}