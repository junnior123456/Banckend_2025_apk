import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';

export enum PaymentMethod {
  YAPE = 'yape',
  PLIN = 'plin',
  BCP = 'bcp',
  INTERBANK = 'interbank',
  OTHER = 'other'
}

export enum DonationStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

@Entity({ name: 'donations' })
export class Donation {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'PEN' })
  currency: string;

  @Column({ 
    type: 'enum', 
    enum: PaymentMethod,
    default: PaymentMethod.YAPE
  })
  paymentMethod: PaymentMethod;

  @Column({ 
    type: 'enum', 
    enum: DonationStatus,
    default: DonationStatus.PENDING
  })
  status: DonationStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  transactionId: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'json', nullable: true })
  metadata: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  // Relación con usuario
  @ManyToOne(() => User, user => user.id)
  @JoinColumn({ name: 'userId' })
  user: User;
}
