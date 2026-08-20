import { Entity, PrimaryGeneratedColumn, Column, Index } from 'typeorm';

/**
 * Tramo de horario de atencion de una veterinaria.
 * Se guarda un tramo por fila: dos filas el mismo dia parten la jornada en
 * mañana y tarde sin necesidad de inventar campos de "pausa para almorzar".
 */
@Entity({ name: 'vet_working_hours' })
export class VetWorkingHours {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int' })
  @Index()
  veterinariaId: number;

  /** 0=domingo ... 6=sabado, igual que Date.getDay() para no traducir nada. */
  @Column({ type: 'smallint' })
  weekday: number;

  /** 'HH:MM:SS'. Se maneja como texto: es hora del reloj, no un instante. */
  @Column({ type: 'time' })
  opensAt: string;

  @Column({ type: 'time' })
  closesAt: string;
}
