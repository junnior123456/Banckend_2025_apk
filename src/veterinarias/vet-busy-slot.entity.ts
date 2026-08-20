import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * Hora ocupada que NO es una cita de la app: lo que el veterinario ya tiene
 * agendado en su propio sistema o local. Es la pieza que evita que un cliente
 * reserve encima de algo que ya existe fuera de PawFinder.
 */
@Entity({ name: 'vet_busy_slot' })
export class VetBusySlot {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  veterinariaId: number;

  @Column({ type: 'timestamp' })
  startsAt: Date;

  @Column({ type: 'timestamp' })
  endsAt: Date;

  @Column({ type: 'varchar', length: 200, nullable: true })
  title: string | null;

  /** 'external' = vino del sistema del veterinario; 'manual' = lo bloqueo el. */
  @Column({ type: 'varchar', length: 20, default: 'external' })
  source: string;

  /** Id en el sistema de origen. Un indice unico sobre (veterinaria, este id)
   *  hace que re-sincronizar actualice en vez de duplicar. */
  @Column({ type: 'varchar', length: 200, nullable: true })
  externalId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
