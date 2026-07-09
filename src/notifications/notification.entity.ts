import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { AdoptionRequest } from '../adoption/adoption-request.entity';

export enum NotificationType {
  // Notificaciones de adopción
  ADOPTION_REQUEST = 'adoption_request',
  ADOPTION_APPROVED = 'adoption_approved',
  ADOPTION_REJECTED = 'adoption_rejected',
  ADOPTION_COMPLETED = 'adoption_completed',
  ADOPTION_REQUEST_SENT = 'adoption_request_sent', // Nueva: confirmación al enviar solicitud
  
  // Notificaciones de comentarios
  NEW_COMMENT = 'new_comment',
  COMMENT_REPLY = 'comment_reply',
  
  // Notificaciones de mascotas
  PET_ADOPTED = 'pet_adopted',
  PET_AVAILABLE = 'pet_available',
  PET_PUBLISHED = 'pet_published', // Nueva: confirmación al publicar
  NEW_PET = 'new_pet', // Comunitaria: nueva mascota disponible
  PET_IN_RISK = 'pet_in_risk', // Comunitaria: mascota en riesgo
  PET_RISK_PUBLISHED = 'pet_risk_published', // Nueva: confirmación al publicar en riesgo
  
  // Notificaciones de donaciones
  NEW_DONATION = 'new_donation',
  
  // Expediente de salud (Módulo 3)
  VACCINE_REMINDER = 'vaccine_reminder', // Recordatorio de vacuna próxima o vencida

  // Notificaciones del sistema
  WELCOME = 'welcome', // Nueva: bienvenida al registrarse
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