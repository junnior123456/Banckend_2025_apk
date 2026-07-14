import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum ConversationType {
  ADOPTION = 'adoption', // adoptante ↔ dueño, sobre una mascota
  VET = 'vet', // cliente ↔ veterinario (consulta / cita)
  DIRECT = 'direct', // conversación directa
}

/**
 * Conversación 1‑a‑1 entre dos usuarios.
 *
 * Los participantes se guardan NORMALIZADOS (`userAId` < `userBId`) para que una
 * pareja tenga una sola conversación por contexto (índice único en la migración).
 */
@Entity({ name: 'conversations' })
export class Conversation {
  @PrimaryGeneratedColumn()
  id: number;

  // varchar (no enum de Postgres) para no tener que gestionar el tipo enum en BD.
  @Column({ type: 'varchar', length: 20, default: ConversationType.DIRECT })
  type: ConversationType;

  @Column({ type: 'int' })
  userAId: number;

  @Column({ type: 'int' })
  userBId: number;

  @Column({ type: 'int', nullable: true })
  petId: number | null;

  @Column({ type: 'int', nullable: true })
  veterinariaId: number | null;

  @Column({ type: 'text', nullable: true })
  lastMessage: string | null;

  @Column({ type: 'timestamp', nullable: true })
  lastMessageAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;
}
