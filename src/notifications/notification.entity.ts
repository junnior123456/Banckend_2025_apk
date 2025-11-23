import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { AdoptionRequest } from '../adoption/adoption-request.entity';

export enum NotificationType {
  ADOPTION_REQUEST = 'adoption_request',
  ADOPTION_APPROVED = 'adoption_approved',
  ADOPTION_REJECTED = 'adoption_rejected',
  ADOPTION_COMPLETED = 'adoption_completed',
  NEW_COMMENT = 'new_comment',
  COMMENT_REPLY = 'comment_reply',
  PET_ADOPTED = 'pet_adopted',
  PET_AVAILABLE = 'pet_available',
  NEW_PET = 'new_pet',
  PET_IN_RISK = 'pet_in_risk',
  NEW_DONATION = 'new_donation',
  SYSTEM_MESSAGE = 'system_message'
}

@Entity({ name: 'notifications' })
export class Notification {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ 
    type: 'enum', 
    enum: NotificationType 
  })
  type: NotificationType;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'json', nullable: true })
  data: any; // Datos adicionales específicos del tipo de notificación

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  readAt: Date;

  @Column({ type: 'int' })
  userId: number; // Usuario que recibe la notificación

  @Column({ type: 'int', nullable: true })
  petId: number; // Mascota relacionada (opcional)

  @Column({ type: 'int', nullable: true })
  adoptionRequestId: number; // Solicitud de adopción relacionada (opcional)

  @Column({ type: 'int', nullable: true })
  fromUserId: number; // Usuario que genera la notificación (opcional)

  // Relaciones
  @ManyToOne(() => User, user => user.notifications)
  @JoinColumn({ name: 'userId' })
  user: User;

  @ManyToOne(() => Pet, pet => pet.notifications, { nullable: true })
  @JoinColumn({ name: 'petId' })
  pet: Pet;

  @ManyToOne(() => AdoptionRequest, request => request.notifications, { nullable: true })
  @JoinColumn({ name: 'adoptionRequestId' })
  adoptionRequest: AdoptionRequest;

  @ManyToOne(() => User, user => user.sentNotifications, { nullable: true })
  @JoinColumn({ name: 'fromUserId' })
  fromUser: User;
}