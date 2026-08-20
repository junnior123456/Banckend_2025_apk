import { hash } from 'bcrypt';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Rol } from 'src/roles/rol.entity';
import { Pet } from 'src/pets/pet.entity';
import { AdoptionRequest } from 'src/adoption/adoption-request.entity';
import { Comment } from 'src/comments/comment.entity';
import { Notification } from 'src/notifications/notification.entity';
import { Report } from 'src/reports/report.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  lastname: string;

  @Column({ unique: true })
  email: string;

  @Column({ unique: true, nullable: true })
  phone: string;

  @Column({ nullable: true })
  image: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  notification_token: string;

  // Nuevos campos para el sistema completo
  @Column({ nullable: true })
  address: string;

  @Column({ type: 'text', nullable: true })
  bio: string; // Biografía del usuario

  @Column({ type: 'boolean', default: true })
  isActive: boolean; // Si el usuario está activo

  @Column({ type: 'boolean', default: false })
  isVerified: boolean; // Si el usuario está verificado

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date; // Último login

  // 🔐 Campos para recuperación de contraseña
  @Column({ nullable: true })
  resetPasswordToken: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpires: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  created_at: Date;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updated_at: Date;

  // Relación con roles (tabla pivote)
  @JoinTable({
    name: 'user_has_roles',
    joinColumn: {
      name: 'id_user',
    },
    inverseJoinColumn: {
      name: 'id_rol',
    },
  })
  @ManyToMany(() => Rol, (rol) => rol.users)
  roles: Rol[];

  // Relación con mascotas
  @OneToMany(() => Pet, (pet) => pet.user)
  pets: Pet[];

  // Nuevas relaciones
  @OneToMany(() => AdoptionRequest, request => request.adopter)
  adoptionRequests: AdoptionRequest[];

  @OneToMany(() => Comment, comment => comment.user)
  comments: Comment[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

  @OneToMany(() => Notification, notification => notification.fromUser)
  sentNotifications: Notification[];

  @OneToMany(() => Report, report => report.reporter)
  reports: Report[];

  @OneToMany(() => Report, report => report.reviewedBy)
  reviewedReports: Report[];

  // 🔒 Encriptar contraseña automáticamente antes de guardar
  @BeforeInsert()
  async hashPassword() {
    const saltRounds = Number(process.env.HASH_SALT) || 10; // valor por defecto 10
    this.password = await hash(this.password, saltRounds);
  }


  /** Intentos de acceso fallidos seguidos. Se pone a cero al entrar bien. */

  @Column({ type: 'int', default: 0 })

  failedLoginAttempts: number;


  /** Hasta cuando esta bloqueada la cuenta por intentos fallidos. */

  @Column({ type: 'timestamp', nullable: true })

  lockedUntil: Date | null;
}
