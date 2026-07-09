import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * "Me gusta" de un usuario a una publicación (mascota). Es también el
 * favorito: `toggleFavorite` operaba sobre un placeholder; ahora persiste aquí.
 * Único por (petId, userId): un usuario da like una sola vez.
 */
@Entity({ name: 'pet_like' })
@Index('uq_pet_like', ['petId', 'userId'], { unique: true })
export class PetLike {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  petId: number;

  @Column({ type: 'int' })
  userId: number;

  @CreateDateColumn()
  createdAt: Date;
}
