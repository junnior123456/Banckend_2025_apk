import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Pet } from '../pets/pet.entity';
import { Comment } from '../comments/comment.entity';

export enum ReportType {
  INAPPROPRIATE_CONTENT = 'inappropriate_content',
  SPAM = 'spam',
  FAKE_LISTING = 'fake_listing',
  ABUSIVE_BEHAVIOR = 'abusive_behavior',
  SCAM = 'scam',
  OTHER = 'other'
}

export enum ReportStatus {
  PENDING = 'pending',
  UNDER_REVIEW = 'under_review',
  RESOLVED = 'resolved',
  DISMISSED = 'dismissed'
}

export enum ReportableType {
  PET = 'pet',
  COMMENT = 'comment',
  USER = 'user'
}

@Entity({ name: 'reports' })
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    type: 'enum', 
    enum: ReportType 
  })
  type: ReportType;

  @Column({ 
    type: 'enum', 
    enum: ReportableType 
  })
  reportableType: ReportableType; // Qué tipo de entidad se está reportando

  @Column({ type: 'int' })
  reportableId: number; // ID de la entidad reportada

  @Column({ type: 'text' })
  reason: string; // Razón detallada del reporte

  @Column({ type: 'text', nullable: true })
  description: string; // Descripción adicional

  @Column({ 
    type: 'enum', 
    enum: ReportStatus, 
    default: ReportStatus.PENDING 
  })
  status: ReportStatus;

  @Column({ type: 'text', nullable: true })
  adminNotes: string; // Notas del administrador

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date;

  @Column({ type: 'int' })
  reporterId: number; // Usuario que hace el reporte

  @Column({ type: 'int', nullable: true })
  reviewedById: number; // Administrador que revisa el reporte

  // Relaciones
  @ManyToOne(() => User, user => user.reports)
  @JoinColumn({ name: 'reporterId' })
  reporter: User;

  @ManyToOne(() => User, user => user.reviewedReports, { nullable: true })
  @JoinColumn({ name: 'reviewedById' })
  reviewedBy: User;

  // Las relaciones polimórficas se manejarán en el servicio
  // No se definen como relaciones de TypeORM para evitar conflictos
}