import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, EntityManager, QueryRunner } from 'typeorm';

/**
 * Contexto de seguridad a nivel de fila (RLS).
 *
 * PostgreSQL decide qué filas ve una consulta leyendo variables de sesión
 * (`app.user_id`, `app.roles`). El problema: TypeORM usa un POOL de conexiones,
 * así que la consulta de un usuario puede acabar en una conexión que otro usó
 * antes. La única forma segura de fijar esas variables es `SET LOCAL` dentro de
 * una transacción, sobre esa misma conexión.
 *
 * Por eso cada petición se ejecuta dentro de una transacción propia, y su
 * QueryRunner viaja por AsyncLocalStorage: así los repositorios que Nest ya
 * inyecta en los servicios lo usan sin tener que reescribir ningún servicio.
 */
export interface RlsStore {
  queryRunner: QueryRunner;
}

export const rlsStorage = new AsyncLocalStorage<RlsStore>();

/** Fija la identidad del usuario para las políticas de PostgreSQL. */
export async function aplicarContexto(
  qr: QueryRunner,
  userId: number | null,
  roles: string[] = [],
  system = false,
): Promise<void> {
  // set_config(..., true) = LOCAL: sólo vive dentro de esta transacción, así que
  // no puede filtrarse a la siguiente petición que reutilice la conexión.
  // Las tres van en UNA sola consulta: cada ida y vuelta a Postgres se paga en
  // latencia, y tres seguidas hundían el rendimiento de las rutas baratas.
  await qr.query(
    'SELECT set_config($1, $2, true), set_config($3, $4, true), set_config($5, $6, true)',
    [
      'app.user_id',
      userId === null || userId === undefined ? '' : String(userId),
      'app.roles',
      (roles || []).join(','),
      'app.system',
      system ? 'on' : 'off',
    ],
  );
}

/**
 * Ejecuta trabajo de fondo (cron) con contexto de sistema.
 *
 * El cron de vacunas no tiene usuario: sin esto, las políticas le devolverían
 * cero filas y los recordatorios dejarían de enviarse en silencio.
 */
export async function ejecutarComoSistema<T>(
  dataSource: DataSource,
  trabajo: () => Promise<T>,
): Promise<T> {
  const qr = dataSource.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();
  try {
    await aplicarContexto(qr, null, [], true);
    const resultado = await rlsStorage.run({ queryRunner: qr }, trabajo);
    await qr.commitTransaction();
    return resultado;
  } catch (e) {
    await qr.rollbackTransaction();
    throw e;
  } finally {
    await qr.release();
  }
}

/**
 * Hace que los repositorios inyectados usen el QueryRunner de la petición actual.
 *
 * Los repositorios preguntan por `manager.queryRunner`; al convertirlo en un
 * getter que lee el AsyncLocalStorage, todas las consultas de una petición caen
 * en su transacción (y por tanto ven sus variables de sesión). Fuera de una
 * petición devuelve undefined y TypeORM se comporta como siempre.
 */
export function engancharRepositorios(dataSource: DataSource): void {
  const manager: EntityManager = dataSource.manager;
  Object.defineProperty(manager, 'queryRunner', {
    get: () => rlsStorage.getStore()?.queryRunner,
    configurable: true,
  });
}
