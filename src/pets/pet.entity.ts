import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../users/user.entity';
import { Category } from '../categories/category.entity';

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

  // Relación con usuario
  @ManyToOne(() => User, user => user.pets)
  @JoinColumn({ name: 'userId' })
  user: User;

  // Relación con categoría
  @ManyToOne(() => Category, category => category.pets)
  @JoinColumn({ name: 'categoryId' })
  category: Category;
}
