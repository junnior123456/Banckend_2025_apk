import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Producto o servicio del catalogo de una veterinaria: su "tienda" dentro de
 * la app. Solo lo publica la cuenta VET dueña de la ficha (o un admin).
 */
@Entity({ name: 'vet_product' })
export class VetProduct {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  veterinariaId: number;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Precio en soles. numeric evita los redondeos raros del float.
   *  OJO: Postgres devuelve numeric como TEXTO en el JSON. */
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  price: string;

  /** 'producto' (se vende por unidades) o 'servicio' (sin stock). */
  @Column({ type: 'varchar', length: 20, default: 'producto' })
  kind: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  category: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  imageUrl: string | null;

  /** Vídeo corto de publicidad del producto o servicio. Lo sube el veterinario
   *  desde su panel y lo ven los clientes en la tienda. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  videoUrl: string | null;

  /** null = no se controla stock (lo normal en los servicios). */
  @Column({ type: 'int', nullable: true })
  stock: number | null;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
