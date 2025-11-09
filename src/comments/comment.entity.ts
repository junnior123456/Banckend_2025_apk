import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { Pet } from '../pets/pet.entity';
import { User } from '../users/user.entity';

@Entity({ name: 'comments' })
export class Comment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean; // Si el comentario fue editado

  @Column({ type: 'boolean', default: false })
  isReported: boolean; // Si el comentario fue reportado

  @Column({ type: 'int', default: 0 })
  reportCount: number; // Número de reportes

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ 
    type: 'timestamp', 
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP'
  })
  updatedAt: Date;

  @Column({ type: 'int' })
  petId: number;

  @Column({ type: 'int' })
  userId: number;

  @Column({ type: 'int', nullable: true })
  parentCommentId: number; // Para respuestas anidadas

  // Relaciones
  @ManyToOne(() => Pet, pet => pet.comments, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'petId' })
  pet: Pet;

  @ManyToOne(() => User, user => user.comments)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Comentario padre (para respuestas)
  @ManyToOne(() => Comment, comment => comment.replies, { nullable: true })
  @JoinColumn({ name: 'parentCommentId' })
  parentComment: Comment;

  // Respuestas a este comentario
  @OneToMany(() => Comment, comment => comment.parentComment)
  replies: Comment[];
}