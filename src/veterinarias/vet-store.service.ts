import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, Repository } from 'typeorm';
import { Veterinaria } from './veterinaria.entity';
import { VetProduct } from './vet-product.entity';
import { VetWorkingHours } from './vet-working-hours.entity';
import { VetBusySlot } from './vet-busy-slot.entity';
import { AppointmentStatus } from '../appointments/appointment.entity';

const ADMIN = '1';

/**
 * El servidor corre en UTC, pero la clínica y sus clientes están en Perú.
 * Sin esto, "abre a las 09:00" se interpretaría como 09:00 UTC, o sea las 4 de
 * la mañana en Tarapoto. Perú NO tiene horario de verano, así que un desfase
 * fijo es exacto y no depende de la zona horaria de la máquina.
 */
const ZONA_PERU = '-05:00';

/** Fecha AAAA-MM-DD de un instante, vista desde Perú. */
function fechaEnPeru(momento: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
  }).format(momento);
}

/** Estados que ocupan sitio en la agenda. Una cita rechazada o cancelada
 *  libera su hora: si no, un rechazo dejaría el hueco muerto para siempre. */
const ESTADOS_QUE_OCUPAN = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
];

@Injectable()
export class VetStoreService {
  private readonly logger = new Logger(VetStoreService.name);

  constructor(
    @InjectRepository(Veterinaria)
    private readonly vets: Repository<Veterinaria>,
    @InjectRepository(VetProduct)
    private readonly productos: Repository<VetProduct>,
    @InjectRepository(VetWorkingHours)
    private readonly horarios: Repository<VetWorkingHours>,
    @InjectRepository(VetBusySlot)
    private readonly ocupados: Repository<VetBusySlot>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Horas de las citas de la app que ocupan agenda.
   *
   * 🔑 Va por SQL en contexto de sistema a propósito: la tabla `appointments`
   * tiene RLS y solo se ve a sí mismo el cliente o el dueño de la veterinaria,
   * pero la consulta de huecos libres es PÚBLICA. Sin esto, a un visitante las
   * citas le quedan invisibles y todos los horarios le salen libres.
   * Se leen ÚNICAMENTE las horas: ningún dato del cliente sale de aquí.
   */
  private async horasOcupadasPorCitas(
    veterinariaId: number,
    desde: Date,
    hasta: Date,
  ): Promise<Date[]> {
    return this.dataSource.transaction(async (manager) => {
      await manager.query("SELECT set_config('app.system', 'on', true)");
      const filas = await manager.query(
        `SELECT "scheduledAt" FROM appointments
          WHERE "veterinariaId" = $1
            AND "scheduledAt" BETWEEN $2 AND $3
            AND status = ANY($4)`,
        [veterinariaId, desde, hasta, ESTADOS_QUE_OCUPAN],
      );
      return filas.map((f: any) => new Date(f.scheduledAt));
    });
  }

  // ============================================================
  //  Permisos
  // ============================================================

  /** Devuelve la veterinaria si el usuario puede gestionarla (es su dueño o
   *  es admin). Lanza si no existe o no le pertenece. */
  private async exigirDueno(
    veterinariaId: number,
    userId: number,
    roles: string[],
  ): Promise<Veterinaria> {
    const vet = await this.vets.findOne({ where: { id: veterinariaId } });
    if (!vet) throw new NotFoundException('Veterinaria no encontrada');
    const esAdmin = (roles || []).includes(ADMIN);
    if (vet.ownerUserId !== userId && !esAdmin) {
      throw new ForbiddenException('Esta veterinaria no es tuya');
    }
    return vet;
  }

  private async exigirVet(veterinariaId: number): Promise<Veterinaria> {
    const vet = await this.vets.findOne({ where: { id: veterinariaId } });
    if (!vet) throw new NotFoundException('Veterinaria no encontrada');
    return vet;
  }

  // ============================================================
  //  Catálogo
  // ============================================================

  /** Catálogo público: solo lo activo. */
  listarProductos(veterinariaId: number) {
    return this.productos.find({
      where: { veterinariaId, isActive: true },
      order: { kind: 'ASC', name: 'ASC' },
    });
  }

  /** Catálogo del dueño: incluye lo desactivado, para poder reactivarlo. */
  async listarProductosDelDueno(
    veterinariaId: number,
    userId: number,
    roles: string[],
  ) {
    await this.exigirDueno(veterinariaId, userId, roles);
    return this.productos.find({
      where: { veterinariaId },
      order: { isActive: 'DESC', name: 'ASC' },
    });
  }

  async crearProducto(
    veterinariaId: number,
    datos: Partial<VetProduct>,
    userId: number,
    roles: string[],
  ) {
    await this.exigirDueno(veterinariaId, userId, roles);
    const producto = this.productos.create({
      ...datos,
      veterinariaId,
      id: undefined,
    });
    return this.productos.save(producto);
  }

  async editarProducto(
    veterinariaId: number,
    productoId: number,
    datos: Partial<VetProduct>,
    userId: number,
    roles: string[],
  ) {
    await this.exigirDueno(veterinariaId, userId, roles);
    const producto = await this.productos.findOne({
      where: { id: productoId, veterinariaId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    Object.assign(producto, { ...datos, id: producto.id, veterinariaId });
    return this.productos.save(producto);
  }

  async borrarProducto(
    veterinariaId: number,
    productoId: number,
    userId: number,
    roles: string[],
  ) {
    await this.exigirDueno(veterinariaId, userId, roles);
    const producto = await this.productos.findOne({
      where: { id: productoId, veterinariaId },
    });
    if (!producto) throw new NotFoundException('Producto no encontrado');
    await this.productos.remove(producto);
    return { ok: true };
  }

  // ============================================================
  //  Horario de atención
  // ============================================================

  listarHorario(veterinariaId: number) {
    return this.horarios.find({
      where: { veterinariaId },
      order: { weekday: 'ASC', opensAt: 'ASC' },
    });
  }

  /** Reemplaza el horario entero de golpe: es como se edita en la app (una
   *  pantalla con los 7 días), y evita tener que casar altas y bajas una a una. */
  async guardarHorario(
    veterinariaId: number,
    tramos: { weekday: number; opensAt: string; closesAt: string }[],
    userId: number,
    roles: string[],
  ) {
    await this.exigirDueno(veterinariaId, userId, roles);

    for (const t of tramos) {
      if (t.weekday < 0 || t.weekday > 6) {
        throw new BadRequestException('weekday tiene que ir de 0 a 6');
      }
      if (!(t.closesAt > t.opensAt)) {
        throw new BadRequestException(
          `El cierre (${t.closesAt}) tiene que ser posterior a la apertura (${t.opensAt})`,
        );
      }
    }

    await this.horarios.delete({ veterinariaId });
    if (!tramos.length) return [];
    return this.horarios.save(
      tramos.map((t) => this.horarios.create({ ...t, veterinariaId })),
    );
  }

  // ============================================================
  //  Horas ocupadas fuera de la app
  // ============================================================

  /**
   * Horas ocupadas de la clínica.
   *
   * 🔒 Solo su dueño o un admin. Estaba con sesión pero SIN comprobar de quién
   * era la clínica, así que cualquier usuario registrado podía leer la agenda
   * interna de cualquier veterinaria, con los títulos de sus intervenciones
   * (auditoría del 20-ago-2026). Los clientes ya tienen `/availability`, que
   * dice qué horas quedan libres sin revelar qué hay en las ocupadas.
   */
  async listarOcupados(
    veterinariaId: number,
    desde: Date,
    hasta: Date,
    userId: number,
    roles: string[],
  ) {
    await this.exigirDueno(veterinariaId, userId, roles);
    return this.ocupados.find({
      where: { veterinariaId, startsAt: Between(desde, hasta) },
      order: { startsAt: 'ASC' },
    });
  }

  /** Registra horas ocupadas. Si traen externalId se actualizan en vez de
   *  duplicarse, para que sincronizar dos veces no llene la agenda de copias. */
  async registrarOcupados(
    veterinariaId: number,
    bloques: {
      startsAt: string | Date;
      endsAt: string | Date;
      title?: string;
      externalId?: string;
      source?: string;
    }[],
  ) {
    let creados = 0;
    let actualizados = 0;

    for (const b of bloques) {
      const inicio = new Date(b.startsAt);
      const fin = new Date(b.endsAt);
      if (isNaN(inicio.getTime()) || isNaN(fin.getTime()) || fin <= inicio) {
        continue; // un bloque con fechas imposibles se ignora, no rompe la carga
      }

      const existente = b.externalId
        ? await this.ocupados.findOne({
            where: { veterinariaId, externalId: b.externalId },
          })
        : null;

      if (existente) {
        existente.startsAt = inicio;
        existente.endsAt = fin;
        existente.title = b.title ?? existente.title;
        await this.ocupados.save(existente);
        actualizados++;
      } else {
        await this.ocupados.save(
          this.ocupados.create({
            veterinariaId,
            startsAt: inicio,
            endsAt: fin,
            title: b.title ?? null,
            externalId: b.externalId ?? null,
            source: b.source ?? 'external',
          }),
        );
        creados++;
      }
    }

    return { creados, actualizados };
  }

  /** Trae el calendario del sistema del veterinario (iCal/ICS) y guarda sus
   *  eventos como horas ocupadas. */
  async sincronizarAgenda(
    veterinariaId: number,
    userId: number,
    roles: string[],
  ) {
    const vet = await this.exigirDueno(veterinariaId, userId, roles);
    if (!vet.externalAgendaUrl) {
      throw new BadRequestException(
        'Esta veterinaria no tiene configurada la URL de su calendario',
      );
    }

    let texto: string;
    try {
      const res: any = await (globalThis as any).fetch(vet.externalAgendaUrl, {
        redirect: 'follow',
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      texto = await res.text();
    } catch (e: any) {
      throw new BadRequestException(
        `No se pudo leer el calendario: ${e?.message ?? e}`,
      );
    }

    const eventos = parsearICal(texto);
    if (!eventos.length) {
      throw new BadRequestException(
        'El calendario se leyó pero no tiene eventos con fecha de inicio y fin',
      );
    }

    const resultado = await this.registrarOcupados(veterinariaId, eventos);
    vet.externalAgendaSyncedAt = new Date();
    await this.vets.save(vet);

    this.logger.log(
      `Agenda de la veterinaria ${veterinariaId}: ${resultado.creados} nuevos, ${resultado.actualizados} actualizados`,
    );
    return { ...resultado, eventosLeidos: eventos.length };
  }

  // ============================================================
  //  Huecos libres
  // ============================================================

  /**
   * Turnos libres de un día concreto. Se parte del horario de atención, se
   * trocea en turnos de `slotMinutes` y se descarta todo lo que choque con
   * una cita de la app o con una hora ocupada del sistema del veterinario.
   */
  async huecosLibres(veterinariaId: number, fechaISO: string) {
    const vet = await this.exigirVet(veterinariaId);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaISO)) {
      throw new BadRequestException('La fecha tiene que ser AAAA-MM-DD');
    }

    const inicioDia = new Date(`${fechaISO}T00:00:00${ZONA_PERU}`);
    const finDia = new Date(`${fechaISO}T23:59:59${ZONA_PERU}`);
    // El día de la semana sale de la fecha del calendario, no de un instante:
    // así no se cuela el desfase de la zona horaria del servidor.
    const [anio, mes, dia] = fechaISO.split('-').map(Number);
    const diaSemana = new Date(Date.UTC(anio, mes - 1, dia)).getUTCDay();

    const tramos = await this.horarios.find({
      where: { veterinariaId, weekday: diaSemana },
      order: { opensAt: 'ASC' },
    });
    if (!tramos.length) {
      return { fecha: fechaISO, slotMinutes: vet.slotMinutes, cerrado: true, libres: [] };
    }

    const [horasDeCitas, ocupados] = await Promise.all([
      this.horasOcupadasPorCitas(veterinariaId, inicioDia, finDia),
      this.ocupados.find({
        where: { veterinariaId, startsAt: Between(inicioDia, finDia) },
      }),
    ]);

    const duracion = vet.slotMinutes * 60 * 1000;

    const bloqueados: { inicio: number; fin: number }[] = [
      ...horasDeCitas.map((h) => {
        const t = h.getTime();
        return { inicio: t, fin: t + duracion };
      }),
      ...ocupados.map((o) => ({
        inicio: new Date(o.startsAt).getTime(),
        fin: new Date(o.endsAt).getTime(),
      })),
    ];

    const ahora = Date.now();
    const libres: string[] = [];

    for (const tramo of tramos) {
      let cursor = new Date(`${fechaISO}T${tramo.opensAt}${ZONA_PERU}`).getTime();
      const cierre = new Date(`${fechaISO}T${tramo.closesAt}${ZONA_PERU}`).getTime();

      while (cursor + duracion <= cierre) {
        const fin = cursor + duracion;
        // Dos intervalos chocan si cada uno empieza antes de que acabe el otro.
        const chocado = bloqueados.some((b) => cursor < b.fin && b.inicio < fin);
        // Un turno que ya pasó no sirve de nada aunque esté libre.
        const yaPaso = cursor <= ahora;
        if (!chocado && !yaPaso) {
          libres.push(new Date(cursor).toISOString());
        }
        cursor = fin;
      }
    }

    return {
      fecha: fechaISO,
      slotMinutes: vet.slotMinutes,
      cerrado: false,
      libres,
    };
  }

  /** ¿Esta veterinaria ha definido horario de atención? Si no, la agenda no
   *  se le exige: sería absurdo rechazar todas las reservas de una clínica que
   *  todavía no ha configurado nada. */
  async tieneAgendaConfigurada(veterinariaId: number): Promise<boolean> {
    const cuantos = await this.horarios.count({ where: { veterinariaId } });
    return cuantos > 0;
  }

  /** ¿Se puede reservar exactamente a esta hora? Lo usa la creación de citas. */
  async estaLibre(veterinariaId: number, cuando: Date): Promise<boolean> {
    const fechaISO = fechaEnPeru(cuando);

    const { libres } = await this.huecosLibres(veterinariaId, fechaISO);
    const objetivo = cuando.getTime();
    return libres.some((iso) => new Date(iso).getTime() === objetivo);
  }
}

/**
 * Lector mínimo de iCal (ICS). Solo saca lo que hace falta para bloquear la
 * agenda: inicio, fin, título e identificador de cada VEVENT.
 * Se hace a mano para no meter otra dependencia por cuatro campos.
 */
export function parsearICal(texto: string) {
  // El formato parte las líneas largas y las continúa con un espacio o tab.
  const lineas = texto
    .replace(/\r\n/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');

  const eventos: {
    startsAt: string;
    endsAt: string;
    title?: string;
    externalId?: string;
  }[] = [];

  let actual: Record<string, string> | null = null;

  for (const linea of lineas) {
    if (linea.startsWith('BEGIN:VEVENT')) {
      actual = {};
      continue;
    }
    if (linea.startsWith('END:VEVENT')) {
      if (actual?.DTSTART && actual?.DTEND) {
        const inicio = fechaICal(actual.DTSTART);
        const fin = fechaICal(actual.DTEND);
        if (inicio && fin) {
          eventos.push({
            startsAt: inicio.toISOString(),
            endsAt: fin.toISOString(),
            title: actual.SUMMARY,
            externalId: actual.UID,
          });
        }
      }
      actual = null;
      continue;
    }
    if (!actual) continue;

    const dosPuntos = linea.indexOf(':');
    if (dosPuntos === -1) continue;
    // La clave puede traer parámetros: "DTSTART;TZID=America/Lima".
    const clave = linea.slice(0, dosPuntos).split(';')[0].toUpperCase();
    const valor = linea.slice(dosPuntos + 1).trim();
    if (['DTSTART', 'DTEND', 'SUMMARY', 'UID'].includes(clave)) {
      actual[clave] = valor;
    }
  }

  return eventos;
}

/** Convierte las fechas de iCal: 20260820T140000Z, 20260820T140000 o 20260820. */
function fechaICal(valor: string): Date | null {
  const limpio = valor.trim();

  const conHora = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(limpio);
  if (conHora) {
    const [, a, m, d, h, min, s, z] = conHora;
    // Sin la Z final, el iCal da hora local del calendario: se asume Perú,
    // que es donde está la clínica. Con Z ya viene en UTC y se respeta.
    const iso = `${a}-${m}-${d}T${h}:${min}:${s}${z ? 'Z' : ZONA_PERU}`;
    const fecha = new Date(iso);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  const soloDia = /^(\d{4})(\d{2})(\d{2})$/.exec(limpio);
  if (soloDia) {
    const [, a, m, d] = soloDia;
    const fecha = new Date(`${a}-${m}-${d}T00:00:00${ZONA_PERU}`);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  return null;
}
